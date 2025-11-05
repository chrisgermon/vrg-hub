import { forwardRef, useEffect, useRef, useMemo, useState } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import 'quill-mention';
import 'quill-mention/dist/quill.mention.css';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserSearchResult } from '@/hooks/useUserSearch';

interface RichTextEditorWithMentionsProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  enableImageUpload?: boolean;
  onMentionedUsersChange?: (users: UserSearchResult[]) => void;
}

// Image upload handler
const imageHandler = function(this: any) {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/*');
  input.click();

  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const range = this.quill.getSelection(true);
    this.quill.insertText(range.index, 'Uploading image...');
    this.quill.setSelection({ index: range.index + 19, length: 0 });

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `news-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      this.quill.deleteText(range.index, 19);
      this.quill.insertEmbed(range.index, 'image', publicUrl);
      this.quill.setSelection({ index: range.index + 1, length: 0 });

      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      this.quill.deleteText(range.index, 19);
      toast.error('Failed to upload image');
    }
  };
};

export const RichTextEditorWithMentions = forwardRef<ReactQuill, RichTextEditorWithMentionsProps>(
  ({ value, onChange, placeholder, className, disabled, enableImageUpload = true, onMentionedUsersChange }, ref) => {
    const quillRef = useRef<ReactQuill>(null);
    const [isDragging, setIsDragging] = useState(false);
    const mentionedUsers = useRef<Set<string>>(new Set());

    const fetchUsers = async (searchTerm: string, renderList: (users: any[], searchTerm: string) => void) => {
      if (!searchTerm || searchTerm.length < 2) {
        renderList([], searchTerm);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
          .eq('is_active', true)
          .limit(10);

        if (error) throw error;

        const users = (data || []).map(user => ({
          id: user.id,
          value: user.email,
          label: user.full_name || user.email,
          email: user.email,
          full_name: user.full_name,
        }));

        renderList(users, searchTerm);
      } catch (error) {
        console.error('Error searching users:', error);
        renderList([], searchTerm);
      }
    };

    const modules = useMemo(() => ({
      toolbar: {
        container: [
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          [{ 'font': [] }],
          [{ 'size': ['small', false, 'large', 'huge'] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'script': 'sub' }, { 'script': 'super' }],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
          [{ 'align': [] }],
          ['blockquote', 'code-block'],
          ['link', ...(enableImageUpload ? ['image'] : []), 'video'],
          ['clean']
        ],
        handlers: enableImageUpload ? {
          image: imageHandler
        } : undefined
      },
      mention: {
        allowedChars: /^[A-Za-z\sÅÄÖåäö@._-]*$/,
        mentionDenotationChars: ['@'],
        source: fetchUsers,
        renderItem: (item: any) => {
          return `${item.label} (${item.email})`;
        },
        onSelect: (item: any, insertItem: any) => {
          mentionedUsers.current.add(item.email);
          insertItem(item);
          
          // Notify parent component of mentioned users
          if (onMentionedUsersChange) {
            const users = Array.from(mentionedUsers.current).map(email => {
              // Find the user data from the item
              return {
                id: item.id,
                value: email,
                label: item.label,
                email: email,
                full_name: item.full_name,
              };
            });
            onMentionedUsersChange(users);
          }
        },
      },
      clipboard: {
        matchVisual: false
      }
    }), [enableImageUpload, onMentionedUsersChange]);

    const formats = [
      'header', 'font', 'size',
      'bold', 'italic', 'underline', 'strike',
      'color', 'background',
      'script',
      'list', 'bullet', 'indent',
      'align',
      'blockquote', 'code-block',
      'link', 'image', 'video',
      'mention'
    ];

    useEffect(() => {
      if (ref && typeof ref !== 'function') {
        (ref as any).current = quillRef.current;
      }
    }, [ref]);

    // Extract mentioned emails from content
    useEffect(() => {
      const extractMentions = () => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(value, 'text/html');
        const mentions = doc.querySelectorAll('.mention');
        
        const newMentions = new Set<string>();
        mentions.forEach(mention => {
          const email = mention.getAttribute('data-value');
          if (email) {
            newMentions.add(email);
          }
        });

        mentionedUsers.current = newMentions;
      };

      extractMentions();
    }, [value]);

    const uploadImageFile = async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed');
        return null;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return null;
      }

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `news-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('company-assets')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('company-assets')
          .getPublicUrl(filePath);

        return publicUrl;
      } catch (error) {
        console.error('Error uploading image:', error);
        toast.error('Failed to upload image');
        return null;
      }
    };

    const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (!enableImageUpload || disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      if (imageFiles.length === 0) {
        toast.error('No image files found');
        return;
      }

      const quill = quillRef.current?.getEditor();
      if (!quill) return;

      toast.info(`Uploading ${imageFiles.length} image(s)...`);

      for (const file of imageFiles) {
        const url = await uploadImageFile(file);
        if (url) {
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', url);
          quill.setSelection({ index: range.index + 1, length: 0 });
        }
      }

      toast.success('Images uploaded successfully');
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (enableImageUpload && !disabled) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    return (
      <div 
        className={cn("rich-text-editor relative", className, isDragging && "ring-2 ring-primary")}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 z-10 flex items-center justify-center border-2 border-dashed border-primary rounded-lg pointer-events-none">
            <p className="text-lg font-medium text-primary">Drop images to upload</p>
          </div>
        )}
        <style>{`
          .rich-text-editor .ql-container {
            min-height: 300px;
            font-size: 16px;
          }
          .rich-text-editor .ql-editor {
            min-height: 300px;
          }
          .rich-text-editor .ql-toolbar {
            background: hsl(var(--muted));
            border-color: hsl(var(--border));
            border-radius: 0.5rem 0.5rem 0 0;
          }
          .rich-text-editor .ql-container {
            border-color: hsl(var(--border));
            border-radius: 0 0 0.5rem 0.5rem;
          }
          .rich-text-editor .ql-editor.ql-blank::before {
            color: hsl(var(--muted-foreground));
          }
          .rich-text-editor .ql-snow .ql-picker-label:hover,
          .rich-text-editor .ql-snow .ql-picker-label.ql-active {
            color: hsl(var(--primary));
          }
          .rich-text-editor .ql-snow.ql-toolbar button:hover,
          .rich-text-editor .ql-snow .ql-toolbar button:hover,
          .rich-text-editor .ql-snow.ql-toolbar button.ql-active,
          .rich-text-editor .ql-snow .ql-toolbar button.ql-active {
            color: hsl(var(--primary));
          }
          .rich-text-editor .ql-snow.ql-toolbar button:hover .ql-stroke,
          .rich-text-editor .ql-snow .ql-toolbar button:hover .ql-stroke,
          .rich-text-editor .ql-snow.ql-toolbar button.ql-active .ql-stroke,
          .rich-text-editor .ql-snow .ql-toolbar button.ql-active .ql-stroke {
            stroke: hsl(var(--primary));
          }
          .rich-text-editor .ql-editor img {
            max-width: 100%;
            height: auto;
            cursor: pointer;
          }
          .mention {
            background-color: hsl(var(--primary) / 0.1);
            color: hsl(var(--primary));
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 500;
          }
          .ql-mention-list-container {
            background-color: hsl(var(--background));
            border: 1px solid hsl(var(--border));
            border-radius: 0.5rem;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
            z-index: 9999;
          }
          .ql-mention-list-item {
            padding: 8px 12px;
            cursor: pointer;
            color: hsl(var(--foreground));
          }
          .ql-mention-list-item:hover,
          .ql-mention-list-item.selected {
            background-color: hsl(var(--accent));
          }
        `}</style>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          readOnly={disabled}
        />
      </div>
    );
  }
);

RichTextEditorWithMentions.displayName = 'RichTextEditorWithMentions';

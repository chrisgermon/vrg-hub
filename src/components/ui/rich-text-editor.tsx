import { forwardRef, useEffect, useRef, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  enableImageUpload?: boolean;
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

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Show loading state
    const range = this.quill.getSelection(true);
    this.quill.insertText(range.index, 'Uploading image...');
    this.quill.setSelection(range.index + 19);

    try {
      // Upload to Supabase Storage
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

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      // Remove loading text and insert image
      this.quill.deleteText(range.index, 19);
      this.quill.insertEmbed(range.index, 'image', publicUrl);
      this.quill.setSelection(range.index + 1);

      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      // Remove loading text
      this.quill.deleteText(range.index, 19);
      toast.error('Failed to upload image');
    }
  };
};

export const RichTextEditor = forwardRef<ReactQuill, RichTextEditorProps>(
  ({ value, onChange, placeholder, className, disabled, enableImageUpload = true }, ref) => {
    const quillRef = useRef<ReactQuill>(null);

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
      clipboard: {
        matchVisual: false
      }
    }), [enableImageUpload]);

    const formats = [
      'header', 'font', 'size',
      'bold', 'italic', 'underline', 'strike',
      'color', 'background',
      'script',
      'list', 'bullet', 'indent',
      'align',
      'blockquote', 'code-block',
      'link', 'image', 'video'
    ];

    useEffect(() => {
      if (ref && typeof ref !== 'function') {
        (ref as any).current = quillRef.current;
      }
    }, [ref]);

    return (
      <div className={cn("rich-text-editor", className)}>
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

RichTextEditor.displayName = 'RichTextEditor';

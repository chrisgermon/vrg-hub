import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @param config - Optional DOMPurify configuration
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(
  html: string | null | undefined,
  config?: DOMPurify.Config
): string {
  if (!html) return '';

  const defaultConfig: DOMPurify.Config = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre',
      'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'hr',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id',
      'width', 'height', 'style',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: true,
    RETURN_TRUSTED_TYPE: false,
  };

  const finalConfig = { ...defaultConfig, ...config };

  return DOMPurify.sanitize(html, finalConfig);
}

/**
 * Sanitize HTML with a more permissive configuration for rich content
 * Use this for trusted content like newsletter templates or admin-created content
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre',
      'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption',
      'div', 'span', 'hr', 'sub', 'sup',
      'video', 'audio', 'source', 'iframe',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'id',
      'width', 'height', 'style', 'controls', 'autoplay', 'loop',
      'frameborder', 'allowfullscreen', 'data-*',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['frameborder', 'allowfullscreen', 'allow'],
    KEEP_CONTENT: true,
  });
}

/**
 * Strip all HTML tags from a string
 * @param html - The HTML string to strip
 * @returns Plain text without any HTML tags
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
}

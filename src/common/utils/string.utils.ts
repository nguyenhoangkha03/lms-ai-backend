export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD') // Normalize unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars except -
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function truncateString(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - suffix.length) + suffix;
}

export function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function toCamelCase(text: string): string {
  return text
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

export function toKebabCase(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const hashtags: string[] = [];
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1]);
  }

  return hashtags;
}

export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'\/]/g, match => htmlEscapes[match]);
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export function generateUniqueId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}_${randomPart}` : `${timestamp}_${randomPart}`;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function parseUserAgent(userAgent: string): {
  browser: string;
  version: string;
  os: string;
} {
  // Simple user agent parsing
  const browser = userAgent.includes('Chrome')
    ? 'Chrome'
    : userAgent.includes('Firefox')
      ? 'Firefox'
      : userAgent.includes('Safari')
        ? 'Safari'
        : userAgent.includes('Edge')
          ? 'Edge'
          : 'Unknown';

  const os = userAgent.includes('Windows')
    ? 'Windows'
    : userAgent.includes('Mac')
      ? 'macOS'
      : userAgent.includes('Linux')
        ? 'Linux'
        : userAgent.includes('Android')
          ? 'Android'
          : userAgent.includes('iOS')
            ? 'iOS'
            : 'Unknown';

  // Extract version (simplified)
  const versionMatch = userAgent.match(/Version\/(\d+\.?\d*)/);
  const version = versionMatch ? versionMatch[1] : 'Unknown';

  return { browser, version, os };
}

export function generateSlugWithFallback(text: string, fallback?: string): string {
  const slug = slugify(text);
  if (!slug && fallback) {
    return slugify(fallback);
  }
  return slug || generateRandomString(8);
}

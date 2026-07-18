import { useEffect } from 'react';

interface SeoInput {
  title: string;
  description?: string;
  /** Absolute or ImageKit URL used for og:image (e.g. a vehicle photo). */
  image?: string;
  type?: 'website' | 'article' | 'product';
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Tiny dependency-free head manager — sets <title> + description + Open Graph /
 * Twitter tags for the current page. Later pages simply overwrite the same tags.
 */
export function useSeo({ title, description, image, type = 'website' }: SeoInput) {
  useEffect(() => {
    const fullTitle = title.includes('Mideeye') ? title : `${title} · Mideeye Motors`;
    document.title = fullTitle;
    if (description) upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', fullTitle);
    if (description) upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', 'Mideeye Motors');
    upsertMeta('property', 'og:url', window.location.href);
    if (image) upsertMeta('property', 'og:image', image);
    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', fullTitle);
    if (description) upsertMeta('name', 'twitter:description', description);
    if (image) upsertMeta('name', 'twitter:image', image);
  }, [title, description, image, type]);
}

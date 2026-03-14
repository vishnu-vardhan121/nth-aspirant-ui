import { useEffect } from 'react';

/**
 * Lightweight head manager (no external deps).
 * Sets title/description/OG/Twitter/canonical/robots and optional JSON-LD.
 */
export default function Seo({
  title,
  description,
  canonicalPath,
  ogImage,
  noIndex = false,
  jsonLd,
}) {
  useEffect(() => {
    const doc = document;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const canonicalUrl = canonicalPath
      ? new URL(canonicalPath, origin || 'https://example.com').toString()
      : origin
        ? new URL(window.location.pathname + window.location.search, origin).toString()
        : undefined;

    const setMeta = (attr, key, value) => {
      if (!value) return;
      let el = doc.head.querySelector(`[${attr}="${key}"][data-nth-seo="true"]`);
      if (!el) el = doc.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = doc.createElement('meta');
        el.setAttribute(attr, key);
        doc.head.appendChild(el);
      }
      el.setAttribute('data-nth-seo', 'true');
      el.setAttribute('content', value);
    };

    if (title) doc.title = title;
    if (description) setMeta('name', 'description', description);

    // Open Graph & Twitter
    setMeta('property', 'og:title', title || '');
    setMeta('property', 'og:description', description || '');
    setMeta('property', 'og:type', 'website');
    if (canonicalUrl) setMeta('property', 'og:url', canonicalUrl);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title || '');
    setMeta('name', 'twitter:description', description || '');
    if (ogImage) {
      setMeta('property', 'og:image', ogImage);
      setMeta('name', 'twitter:image', ogImage);
    }

    // Canonical link
    if (canonicalUrl) {
      let link = doc.head.querySelector('link[rel="canonical"][data-nth-seo="true"]');
      if (!link) link = doc.head.querySelector('link[rel="canonical"]');
      if (!link) {
        link = doc.createElement('link');
        link.setAttribute('rel', 'canonical');
        doc.head.appendChild(link);
      }
      link.setAttribute('data-nth-seo', 'true');
      link.setAttribute('href', canonicalUrl);
    }

    // Robots
    const robots =
      doc.head.querySelector('meta[name="robots"][data-nth-seo="true"]') ||
      doc.head.querySelector('meta[name="robots"]');
    if (noIndex) {
      if (!robots) {
        const el = doc.createElement('meta');
        el.setAttribute('name', 'robots');
        el.setAttribute('content', 'noindex,nofollow');
        el.setAttribute('data-nth-seo', 'true');
        doc.head.appendChild(el);
      } else {
        robots.setAttribute('data-nth-seo', 'true');
        robots.setAttribute('content', 'noindex,nofollow');
      }
    } else if (robots) {
      robots.setAttribute('data-nth-seo', 'true');
      robots.setAttribute('content', 'index,follow');
    }

    // JSON-LD
    const jsonLdStr =
      typeof jsonLd === 'string'
        ? jsonLd
        : jsonLd
          ? JSON.stringify(jsonLd)
          : null;
    let ldEl = doc.head.querySelector('script[type="application/ld+json"][data-nth-seo="true"]');
    if (jsonLdStr) {
      if (!ldEl) {
        ldEl = doc.createElement('script');
        ldEl.type = 'application/ld+json';
        ldEl.setAttribute('data-nth-seo', 'true');
        doc.head.appendChild(ldEl);
      }
      ldEl.textContent = jsonLdStr;
    } else if (ldEl) {
      ldEl.remove();
    }
  }, [title, description, canonicalPath, ogImage, noIndex, jsonLd]);

  return null;
}

import { useEffect } from 'react';

const SITE_ORIGIN = 'https://naveentalenthub.in';

/**
 * Lightweight head manager (no external deps).
 * Sets title, meta, OG/Twitter, canonical, optional keywords/geo, and JSON-LD.
 */
export default function Seo({
  title,
  description,
  keywords,
  author,
  geoRegion,
  geoPlacename,
  canonicalPath,
  canonicalUrl,
  ogImage,
  ogTitle,
  ogDescription,
  ogUrl,
  twitterTitle,
  twitterDescription,
  noIndex = false,
  jsonLd,
}) {
  useEffect(() => {
    const doc = document;
    const origin = typeof window !== 'undefined' ? window.location.origin : SITE_ORIGIN;
    const resolvedCanonical =
      canonicalUrl ||
      (canonicalPath
        ? new URL(canonicalPath, origin || SITE_ORIGIN).toString()
        : typeof window !== 'undefined'
          ? new URL(window.location.pathname + window.location.search, origin).toString()
          : undefined);

    const resolvedOgImage = ogImage
      ? ogImage.startsWith('http')
        ? ogImage
        : new URL(ogImage, origin || SITE_ORIGIN).toString()
      : undefined;

    const setMeta = (attr, key, value) => {
      if (value === undefined || value === null || value === '') {
        const existing = doc.head.querySelector(`[${attr}="${key}"][data-nth-seo="true"]`);
        if (existing) existing.remove();
        return;
      }
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
    setMeta('name', 'description', description || null);
    setMeta('name', 'keywords', keywords || null);
    setMeta('name', 'author', author || null);
    setMeta('name', 'geo.region', geoRegion || null);
    setMeta('name', 'geo.placename', geoPlacename || null);

    const ogTitleVal = ogTitle ?? title ?? '';
    const ogDescVal = ogDescription ?? description ?? '';
    const twitterTitleVal = twitterTitle ?? ogTitleVal;
    const twitterDescVal = twitterDescription ?? ogDescription ?? description ?? '';
    const ogUrlVal = ogUrl ?? resolvedCanonical ?? '';

    setMeta('property', 'og:title', ogTitleVal || null);
    setMeta('property', 'og:description', ogDescVal || null);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', ogUrlVal || null);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', twitterTitleVal || null);
    setMeta('name', 'twitter:description', twitterDescVal || null);

    if (resolvedOgImage) {
      setMeta('property', 'og:image', resolvedOgImage);
      setMeta('name', 'twitter:image', resolvedOgImage);
    }

    if (resolvedCanonical) {
      let link = doc.head.querySelector('link[rel="canonical"][data-nth-seo="true"]');
      if (!link) link = doc.head.querySelector('link[rel="canonical"]');
      if (!link) {
        link = doc.createElement('link');
        link.setAttribute('rel', 'canonical');
        doc.head.appendChild(link);
      }
      link.setAttribute('data-nth-seo', 'true');
      link.setAttribute('href', resolvedCanonical);
    }

    const robots =
      doc.head.querySelector('meta[name="robots"][data-nth-seo="true"]') ||
      doc.head.querySelector('meta[name="robots"]');
    const robotsContent = noIndex ? 'noindex,nofollow' : 'index,follow';
    if (!robots) {
      const el = doc.createElement('meta');
      el.setAttribute('name', 'robots');
      el.setAttribute('content', robotsContent);
      el.setAttribute('data-nth-seo', 'true');
      doc.head.appendChild(el);
    } else {
      robots.setAttribute('data-nth-seo', 'true');
      robots.setAttribute('content', robotsContent);
    }

    const jsonLdStr =
      typeof jsonLd === 'string' ? jsonLd : jsonLd ? JSON.stringify(jsonLd) : null;
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
  }, [
    title,
    description,
    keywords,
    author,
    geoRegion,
    geoPlacename,
    canonicalPath,
    canonicalUrl,
    ogImage,
    ogTitle,
    ogDescription,
    ogUrl,
    twitterTitle,
    twitterDescription,
    noIndex,
    jsonLd,
  ]);

  return null;
}

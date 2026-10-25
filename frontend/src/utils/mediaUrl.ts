import api from '../services/api';

export function resolveMediaUrl(
  url: string,
  apiBaseUrl = api.defaults.baseURL,
  pageOrigin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
): string {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url, pageOrigin);
  } catch {
    return url;
  }

  const isProductImage = parsedUrl.pathname.startsWith('/api/products/images/');
  const isLegacyUpload = parsedUrl.pathname.startsWith('/uploads/product-images/');
  if (!isProductImage && !isLegacyUpload) return url;

  const apiOrigin = new URL(apiBaseUrl ?? pageOrigin, pageOrigin).origin;
  return new URL(`${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`, apiOrigin).toString();
}

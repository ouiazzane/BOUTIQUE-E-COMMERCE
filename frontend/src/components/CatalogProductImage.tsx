import { useEffect, useState } from 'react';

import type { Product } from '../types';
import { selectProductImage } from '../utils/productImages';
import { getCategoryCopy, getProductName } from '../utils/catalogText';
import { resolveMediaUrl } from '../utils/mediaUrl';

type CatalogProductImageProps = {
  product: Pick<Product, 'name' | 'sku' | 'categoryId' | 'images'>;
  imageUrl?: string;
  className?: string;
};

export default function CatalogProductImage({ product, imageUrl, className = '' }: CatalogProductImageProps) {
  const selected = selectProductImage(imageUrl ? { ...product, images: [{ url: imageUrl }] } : product);
  const resolvedSelectedSource = resolveMediaUrl(selected.src);
  const displayName = getProductName(product.sku, product.name);
  const categoryName = typeof product.categoryId === 'object' && product.categoryId !== null
    ? getCategoryCopy(product.categoryId).name
    : getCategoryCopy(product.categoryId ?? '').name;
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  useEffect(() => {
    setFailedSource(null);
    setFallbackFailed(false);
  }, [selected.src]);

  const usingFallback = selected.isFallback || failedSource === selected.src;
  const displayedSource = usingFallback ? selectProductImage({ sku: product.sku, categoryId: product.categoryId }).src : resolvedSelectedSource;

  if (fallbackFailed) {
    return <div role="img" aria-label={`${displayName} — category image unavailable`} className={`flex items-center justify-center bg-slate-100 text-center text-xs text-slate-500 ${className}`}>{categoryName} image unavailable</div>;
  }

  return <img
    src={displayedSource}
    alt={usingFallback ? `${categoryName} category illustration for ${displayName}` : displayName}
    className={className}
    loading="lazy"
    onError={() => {
      if (!usingFallback) {
        setFailedSource(selected.src);
      } else {
        setFallbackFailed(true);
      }
    }}
  />;
}

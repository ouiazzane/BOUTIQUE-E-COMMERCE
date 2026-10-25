import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import ProductCard from '../components/ProductCard';
import api from '../services/api';
import type { ApiResponse, Category, Product } from '../types';
import { getCategoryCopy } from '../utils/catalogText';

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  useEffect(() => {
    setCategory(searchParams.get('category') ?? '');
    setSearch(searchParams.get('search') ?? '');
  }, [searchParams]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['products', search, category],
    queryFn: async () => {
      const response = await api.get('/products', {
        params: {
          search,
          category,
          sort: 'newest',
          page: 1,
          limit: 12
        }
      });
      return response.data as ApiResponse<{ products: Product[]; pagination: { totalItems: number } }>;
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-store'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data.data as Category[];
    }
  });

  const onApply = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    setSearchParams(params);
  };

  const products = data?.data.products ?? [];

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Search</label>
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="Product name" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2">
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item._id} value={item.slug}>{getCategoryCopy(item).name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={onApply} className="w-full rounded-xl bg-slate-900 px-4 py-2 font-medium text-white">Apply filters</button>
          </div>
        </div>
      </div>

      {isLoading && <p className="text-slate-500">Loading products…</p>}
      {isError && <p className="text-red-600">We couldn’t load the products. Please try again.</p>}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>

      {!isLoading && !isError && products.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          No products match your search.
        </div>
      )}
    </div>
  );
}

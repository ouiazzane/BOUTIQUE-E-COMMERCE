import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ImagePlus, Pencil, Plus, RotateCcw, Search, Trash2, Upload, X } from 'lucide-react';

import api from '../../services/api';
import CatalogProductImage from '../../components/CatalogProductImage';
import type { Category, Product } from '../../types';
import { getCategoryCopy, getProductCopy, getProductName } from '../../utils/catalogText';
import { formatMoney } from '../../services/currency';

type ProductForm = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  price: string;
  compareAtPrice: string;
  sku: string;
  stock: string;
  imageUrl: string;
  isFeatured: boolean;
};

type ImageSource = 'device' | 'url';

const emptyForm: ProductForm = { name: '', slug: '', shortDescription: '', description: '', categoryId: '', price: '', compareAtPrice: '', sku: '', stock: '0', imageUrl: '', isFeatured: false };
const slugify = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function getErrorMessage(error: unknown) {
  return (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'The request failed. Please try again.';
}

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSource, setImageSource] = useState<ImageSource>('device');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const productsQuery = useQuery({ queryKey: ['admin-products', page, search], queryFn: async () => (await api.get('/admin/products', { params: { page, limit: 20, search } })).data.data as { products: Product[]; pagination: { page: number; totalPages: number; totalItems: number } } });
  const categoriesQuery = useQuery({ queryKey: ['admin-categories'], queryFn: async () => (await api.get('/admin/categories')).data.data as (Category & { productCount: number })[] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let imageUrl = form.imageUrl.trim();
      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append('image', imageFile);
        const uploadResponse = await api.post('/products/images', uploadData);
        imageUrl = uploadResponse.data.data.url as string;
      }

      const payload = {
        name: form.name.trim(), slug: form.slug.trim(), shortDescription: form.shortDescription.trim(), description: form.description.trim(),
        categoryId: form.categoryId, price: Number(form.price), compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
        sku: form.sku.trim(), stock: Number(form.stock), images: imageUrl ? [{ url: imageUrl, alt: form.name.trim(), isPrimary: true }] : [],
        isActive: editing?.isActive ?? true, isFeatured: form.isFeatured
      };
      return editing ? api.patch(`/products/${editing._id}`, payload) : api.post('/products', payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setNotice(editing ? 'Product updated.' : 'Product added.');
      setError('');
      closeForm();
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError))
  });

  const deactivateMutation = useMutation({
    mutationFn: (product: Product) => api.delete(`/products/${product._id}`),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['admin-products'] }); await queryClient.invalidateQueries({ queryKey: ['products'] }); setNotice('Product deactivated.'); setError(''); },
    onError: (mutationError) => setError(getErrorMessage(mutationError))
  });
  const activateMutation = useMutation({
    mutationFn: (product: Product) => api.patch(`/products/${product._id}`, { isActive: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setNotice('Product reactivated.');
      setError('');
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError))
  });
  const permanentDeleteMutation = useMutation({
    mutationFn: (product: Product) => api.delete(`/products/${product._id}/permanent`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      setNotice('Product permanently deleted.');
      setError('');
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError))
  });

  const products = productsQuery.data?.products ?? [];
  const pagination = productsQuery.data?.pagination;

  function closeForm() { setEditing(null); setFormOpen(false); setForm(emptyForm); setImageFile(null); setImageSource('device'); setError(''); }
  function startCreate() { setEditing(null); setFormOpen(true); setForm({ ...emptyForm, categoryId: categoriesQuery.data?.find((category) => category.isActive)?._id ?? '' }); setImageFile(null); setImageSource('device'); setError(''); setNotice(''); }
  function startEdit(product: Product) {
    const image = product.images?.[0]?.url ?? '';
    const copy = getProductCopy(product.sku, { name: product.name, shortDescription: product.shortDescription ?? '', description: product.description ?? '' });
    setEditing(product);
    setFormOpen(true);
    setForm({ name: copy.name, slug: product.slug, shortDescription: copy.shortDescription, description: copy.description, categoryId: typeof product.categoryId === 'string' ? product.categoryId : product.categoryId._id, price: String(product.price), compareAtPrice: product.compareAtPrice == null ? '' : String(product.compareAtPrice), sku: product.sku, stock: String(product.stock), imageUrl: image, isFeatured: Boolean(product.isFeatured) });
    setImageFile(null);
    setImageSource(image.startsWith('http') ? 'url' : 'device');
    setError(''); setNotice('');
  }

  function submit(event: React.FormEvent) { event.preventDefault(); setError(''); saveMutation.mutate(); }
  function permanentlyDelete(product: Product, displayName: string) {
    if (!window.confirm(`Permanently delete “${displayName}”? This cannot be undone. Products in order history cannot be deleted.`)) return;
    setError('');
    permanentDeleteMutation.mutate(product);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-indigo-600">Catalog</p><h2 className="mt-1 text-3xl font-bold text-slate-950">Products</h2><p className="mt-2 text-sm text-slate-500">Add, edit, deactivate, reactivate, or permanently delete products.</p></div><button onClick={startCreate} type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"><Plus className="h-4 w-4" />New product</button></div>
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      {error && !editing && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {productsQuery.isLoading || categoriesQuery.isLoading ? <div className="rounded-2xl bg-white p-8 text-slate-500">Loading catalog…</div> : productsQuery.isError || categoriesQuery.isError ? <div role="alert" className="rounded-2xl bg-red-50 p-6 text-red-700">Could not load the data. Check your admin permissions.</div> : null}
      {formOpen && <ProductEditor form={form} categories={categoriesQuery.data ?? []} editing={Boolean(editing)} saving={saveMutation.isPending} error={error} imageFile={imageFile} imageSource={imageSource} onChange={setForm} onImageFileChange={setImageFile} onImageSourceChange={(source) => { setImageSource(source); if (source === 'url') setImageFile(null); }} onCancel={closeForm} onSubmit={submit} />}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-slate-900">Full catalog</h3><p className="text-sm text-slate-500">{pagination?.totalItems ?? 0} products total</p></div><label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name, SKU, or slug…" className="w-full text-sm outline-none sm:w-64" /></label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">SKU</th><th className="px-5 py-3">Price / stock</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{products.map((product) => { const displayName = getProductName(product.sku, product.name); const actionPending = deactivateMutation.isPending || activateMutation.isPending || permanentDeleteMutation.isPending; return <tr key={product._id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><div className="flex items-center gap-3"><CatalogProductImage product={product} className="h-11 w-11 rounded-lg object-cover" /><div><p className="font-semibold text-slate-900">{displayName}</p><p className="text-xs text-slate-500">{product.slug}</p></div></div></td><td className="px-5 py-4 font-mono text-xs">{product.sku}</td><td className="px-5 py-4"><p className="font-semibold">{formatMoney(product.price)}</p><p className="text-xs text-slate-500">{product.stock} in stock</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${product.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{product.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => startEdit(product)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-indigo-200 hover:text-indigo-700" aria-label={`Edit ${displayName}`}><Pencil className="h-4 w-4" /></button>{product.isActive ? <button type="button" onClick={() => { if (window.confirm(`Deactivate “${displayName}”?`)) deactivateMutation.mutate(product); }} disabled={actionPending} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Deactivate</button> : <button type="button" onClick={() => activateMutation.mutate(product)} disabled={actionPending} className="inline-flex items-center gap-1 rounded-lg border border-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><RotateCcw className="h-3.5 w-3.5" />Reactivate</button>}<button type="button" onClick={() => permanentlyDelete(product, displayName)} disabled={actionPending} className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" aria-label={`Permanently delete ${displayName}`}><Trash2 className="h-3.5 w-3.5" />Delete</button></div></td></tr>;})}</tbody></table></div>
        {!productsQuery.isLoading && products.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No matching products.</p>}
        {pagination && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm"><span className="text-slate-500">Page {pagination.page} of {pagination.totalPages}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40">Previous</button><button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40">Next</button></div></div>}
      </section>
    </div>
  );
}

function ProductEditor({ form, categories, editing, saving, error, imageFile, imageSource, onChange, onImageFileChange, onImageSourceChange, onCancel, onSubmit }: { form: ProductForm; categories: Category[]; editing: boolean; saving: boolean; error: string; imageFile: File | null; imageSource: ImageSource; onChange: (form: ProductForm) => void; onImageFileChange: (file: File | null) => void; onImageSourceChange: (source: ImageSource) => void; onCancel: () => void; onSubmit: (event: React.FormEvent) => void }) {
  const [localPreview, setLocalPreview] = useState('');
  const set = (key: keyof ProductForm, value: string | boolean) => onChange({ ...form, [key]: value });
  const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100';
  useEffect(() => {
    if (!imageFile) { setLocalPreview(''); return; }
    const objectUrl = URL.createObjectURL(imageFile);
    setLocalPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onCancel(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, saving]);

  const previewProduct = {
    name: form.name || 'Product preview',
    sku: form.sku,
    categoryId: categories.find((item) => item._id === form.categoryId)?._id ?? form.categoryId,
    images: imageFile ? [] : form.imageUrl.trim() ? [{ url: form.imageUrl.trim(), alt: form.name, isPrimary: true }] : []
  };
  const imagePreview = localPreview || undefined;

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onCancel(); }}>
    <form onSubmit={onSubmit} role="dialog" aria-modal="true" aria-labelledby="product-editor-title" className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7"><div><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Product catalog</p><h3 id="product-editor-title" className="mt-1 text-xl font-bold text-slate-950">{editing ? 'Edit product' : 'Add product'}</h3></div><button type="button" onClick={onCancel} disabled={saving} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50" aria-label="Close"><X className="h-5 w-5" /></button></div>
      <div className="space-y-5 overflow-y-auto p-5 sm:p-7">
    {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-4 md:grid-cols-2"><Field label="Name *"><input className={fieldClass} value={form.name} onChange={(event) => { const name = event.target.value; onChange({ ...form, name, ...(!editing ? { slug: slugify(name) } : {}) }); }} required minLength={2} /></Field><Field label="Slug *"><input className={fieldClass} value={form.slug} onChange={(event) => set('slug', event.target.value)} required minLength={2} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></Field><Field label="SKU *"><input className={fieldClass} value={form.sku} onChange={(event) => set('sku', event.target.value)} required minLength={3} /></Field><Field label="Category *"><select className={fieldClass} value={form.categoryId} onChange={(event) => set('categoryId', event.target.value)} required><option value="">Select a category</option>{categories.filter((category) => category.isActive || category._id === form.categoryId).map((category) => <option key={category._id} value={category._id}>{getCategoryCopy(category).name}{category.isActive ? '' : ' (inactive)'}</option>)}</select></Field><Field label="Price (€) *"><input className={fieldClass} type="number" min="0" step="0.01" value={form.price} onChange={(event) => set('price', event.target.value)} required /></Field><Field label="Compare-at price (€)"><input className={fieldClass} type="number" min="0" step="0.01" value={form.compareAtPrice} onChange={(event) => set('compareAtPrice', event.target.value)} /></Field><Field label="Stock *"><input className={fieldClass} type="number" min="0" step="1" value={form.stock} onChange={(event) => set('stock', event.target.value)} required /></Field>
      <div className="space-y-2"><span className="block text-sm font-medium text-slate-700">Product image</span><div className="inline-flex rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => onImageSourceChange('device')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${imageSource === 'device' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}><Upload className="h-4 w-4" />From my device</button><button type="button" onClick={() => onImageSourceChange('url')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${imageSource === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>From a URL</button></div>
        {imageSource === 'device' ? <label className="flex min-h-24 cursor-pointer items-center gap-4 rounded-xl border border-dashed border-slate-300 p-4 hover:border-indigo-400 hover:bg-indigo-50/40"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><ImagePlus className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-slate-800">{imageFile?.name ?? 'Choose a photo from your device'}</span><span className="mt-1 block text-xs text-slate-500">JPG, PNG or WebP, up to 5 MB</span></span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] ?? null; onImageFileChange(file); if (file) set('imageUrl', ''); }} /></label> : <Field label="Image URL"><input className={fieldClass} type="url" value={form.imageUrl} onChange={(event) => { set('imageUrl', event.target.value); onImageFileChange(null); }} placeholder="https://…" /></Field>}
      </div>
      <Field label="Short description *"><input className={fieldClass} value={form.shortDescription} onChange={(event) => set('shortDescription', event.target.value)} required minLength={10} /></Field><Field label="Full description *"><textarea className={fieldClass} rows={3} value={form.description} onChange={(event) => set('description', event.target.value)} required minLength={20} /></Field></div>
    <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-3">{imagePreview ? <img src={imagePreview} alt="Selected image preview" className="h-20 w-20 rounded-lg object-cover" /> : <CatalogProductImage product={previewProduct} className="h-20 w-20 rounded-lg object-cover" />}<p className="text-sm text-slate-600">Preview of the image that will be saved for this product.</p></div>
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={form.isFeatured} onChange={(event) => set('isFeatured', event.target.checked)} className="rounded border-slate-300" />Feature this product</label>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-7"><button type="button" onClick={onCancel} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Check className="h-4 w-4" />{saving ? (imageFile ? 'Uploading image…' : 'Saving…') : editing ? 'Save changes' : 'Create product'}</button></div>
    </form>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>; }

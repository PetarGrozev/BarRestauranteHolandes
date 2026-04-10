"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppToastStack from '@/components/AppToast';
import useAppToasts from '@/hooks/useAppToasts';
import { fileToProductImageDataUrl, MAX_PRODUCT_IMAGE_BYTES } from '@/lib/productImages';
import type { ProductCategory } from '@/types';

const EditProductPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('FOOD');
  const [orderTarget, setOrderTarget] = useState('KITCHEN');
  const [isEnabled, setIsEnabled] = useState(true);
  const { toasts, pushToast, removeToast } = useAppToasts();

  useEffect(() => {
    if (!id) return;
    fetch(`/api/products/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => {
        setName(data.name);
        setDescription(data.description || '');
        setPrice(String(data.price));
        setStock(String(data.stock ?? 0));
        setImageUrl(data.imageUrl || '');
        setImageName('');
        setCategory(data.category);
        setOrderTarget(data.orderTarget);
        setIsEnabled(Boolean(data.isEnabled));
      })
      .catch(() => pushToast({ message: 'Product niet gevonden.', title: 'Product', variant: 'error' }))
      .finally(() => setLoading(false));
  }, [id]);

  const handleImageSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const nextImageUrl = await fileToProductImageDataUrl(file);
      setImageUrl(nextImageUrl);
      setImageName(file.name);
    } catch (error) {
      const code = error instanceof Error ? error.message : 'UNKNOWN';
      pushToast({
        title: 'Afbeelding',
        variant: 'error',
        message:
          code === 'FILE_TOO_LARGE'
            ? `De afbeelding overschrijdt de limiet van ${Math.round(MAX_PRODUCT_IMAGE_BYTES / 1024 / 1024)} MB.`
            : 'Selecteer een geldige JPG-, PNG-, WEBP- of GIF-afbeelding.',
      });
    } finally {
      event.target.value = '';
    }
  };

  const clearImage = () => {
    setImageUrl('');
    setImageName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          price: parseFloat(price),
          stock: Number(stock),
          isEnabled,
          image: imageUrl || undefined,
          category,
          orderDestination: orderTarget.toLowerCase(),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? 'Failed');
      }
      pushToast({ message: 'Product is succesvol bijgewerkt.', title: 'Product', variant: 'success' });
      router.push('/admin/products');
    } catch (error) {
      pushToast({
        message: error instanceof Error && error.message !== 'Failed' ? error.message : 'Product bijwerken is mislukt.',
        title: 'Product',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p>Product laden...</p>;

  return (
    <div className="form-page">
      <div className="product-form-header">
        <h1>Product bewerken</h1>
        <p className="page-subtitle">Pas gegevens aan, controleer de kaart en sla op wanneer alles klopt.</p>
      </div>
      <div className="product-form-layout">
        <form className="form-card product-form-card" onSubmit={handleSubmit}>
          <div className="product-form-grid">
            <div className="form-field product-form-field--wide">
              <label>Naam</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Bijvoorbeeld: bruiswater" />
            </div>
            <div className="form-field product-form-field--wide">
              <label>Beschrijving</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Korte details zodat het snel herkenbaar is" />
            </div>
            <div className="form-field">
              <label>Prijs (€)</label>
              <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required placeholder="0.00" />
            </div>
            <div className="form-field">
              <label>Beschikbare voorraad</label>
              <input type="number" step="1" min="0" value={stock} onChange={e => setStock(e.target.value)} required placeholder="0" />
              <p className="form-help-text">Bij voorraad 0 kan het product pas weer besteld worden na aanvullen.</p>
            </div>
            <div className="form-field">
              <label>Productafbeelding</label>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageSelection} />
              <p className="form-help-text">Selecteer de foto vanaf je mobiel, tablet of computer. Maximaal 2 MB.</p>
              {imageName && <p className="form-help-text">Geselecteerd bestand: {imageName}</p>}
              {imageUrl && (
                <div className="product-image-field-actions">
                  <button className="btn-ghost" type="button" onClick={clearImage}>Afbeelding verwijderen</button>
                </div>
              )}
            </div>
            <div className="form-field">
              <label>Categorie</label>
              <select value={category} onChange={e => setCategory(e.target.value as ProductCategory)}>
                <option value="FOOD">Eten</option>
                <option value="DRINK">Drank</option>
              </select>
            </div>
            <div className="form-field">
              <label>Bestemmingsdoel</label>
              <select value={orderTarget} onChange={e => setOrderTarget(e.target.value)}>
                <option value="KITCHEN">Keuken</option>
                <option value="STAFF">Bediening</option>
                <option value="BOTH">Beide</option>
              </select>
            </div>
            <div className="form-field">
              <label>Productstatus</label>
              <select value={isEnabled ? 'enabled' : 'disabled'} onChange={e => setIsEnabled(e.target.value === 'enabled')}>
                <option value="enabled">Ingeschakeld</option>
                <option value="disabled">Uitgeschakeld</option>
              </select>
            </div>
          </div>
          <div className="form-actions product-form-actions">
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Opslaan...' : 'Wijzigingen opslaan'}
            </button>
            <button className="btn-ghost" type="button" onClick={() => router.back()}>
              Annuleren
            </button>
          </div>
        </form>

        <aside className="product-preview-card" aria-label="Voorbeeld van product">
          <div className="product-preview-media">
            {imageUrl ? <img src={imageUrl} alt={name || 'Productvoorbeeld'} /> : <span>Geen afbeelding</span>}
          </div>
          <div className="product-preview-body">
            <div className="product-preview-badges">
              <span className="product-preview-badge">{category === 'DRINK' ? 'Drank' : 'Eten'}</span>
              <span className="product-preview-badge product-preview-badge--muted">
                {orderTarget === 'KITCHEN' ? 'Keuken' : orderTarget === 'STAFF' ? 'Bediening' : 'Beide'}
              </span>
              <span className="product-preview-badge product-preview-badge--muted">
                {Number(stock) > 0 ? `Voorraad ${Number(stock)}` : 'Geen voorraad'}
              </span>
              <span className="product-preview-badge product-preview-badge--muted">{isEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}</span>
            </div>
            <h2>{name || 'Productnaam'}</h2>
            <p>{description || 'De beschrijving verschijnt hier zodat je meteen ziet hoe die op de kaart wordt gelezen.'}</p>
            <strong>{price ? `${Number(price).toFixed(2)} €` : '0.00 €'}</strong>
          </div>
        </aside>
      </div>

      <AppToastStack toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default EditProductPage;

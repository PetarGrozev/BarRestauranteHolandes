"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppToastStack from '@/components/AppToast';
import useAppToasts from '@/hooks/useAppToasts';
import { fileToProductImageDataUrl, MAX_PRODUCT_IMAGE_BYTES } from '@/lib/productImages';
import type { ProductCategory } from '@/types';

const CreateProductPage = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('FOOD');
  const [orderTarget, setOrderTarget] = useState('KITCHEN');
  const [submitting, setSubmitting] = useState(false);
  const { toasts, pushToast, removeToast } = useAppToasts();

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
        title: 'Imagen',
        variant: 'error',
        message:
          code === 'FILE_TOO_LARGE'
            ? `La imagen supera el límite de ${Math.round(MAX_PRODUCT_IMAGE_BYTES / 1024 / 1024)} MB.`
            : 'Selecciona una imagen JPG, PNG, WEBP o GIF válida.',
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
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          price: parseFloat(price),
          image: imageUrl || undefined,
          category,
          orderDestination: orderTarget.toLowerCase(),
        }),
      });
      if (!res.ok) throw new Error('Failed');
      pushToast({ message: 'Producto creado correctamente.', title: 'Producto', variant: 'success' });
      router.push('/admin/products');
    } catch {
      pushToast({ message: 'Error al crear producto.', title: 'Producto', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-page">
      <div className="product-form-header">
        <h1>Nuevo Producto</h1>
        <p className="page-subtitle">Completa los datos y revisa la vista previa antes de guardarlo.</p>
      </div>
      <div className="product-form-layout">
        <form className="form-card product-form-card" onSubmit={handleSubmit}>
          <div className="product-form-grid">
            <div className="form-field product-form-field--wide">
              <label>Nombre</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ejemplo: Agua con gas" />
            </div>
            <div className="form-field product-form-field--wide">
              <label>Descripción</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalles breves para que se identifique rápido" />
            </div>
            <div className="form-field">
              <label>Precio (€)</label>
              <input type="number" step="0.01" min="0" value={price} onChange={e => setPrice(e.target.value)} required placeholder="0.00" />
            </div>
            <div className="form-field">
              <label>Imagen del Producto</label>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleImageSelection} />
              <p className="form-help-text">Selecciona la foto desde tu móvil, tablet u ordenador. Máximo 2 MB.</p>
              {imageName && <p className="form-help-text">Archivo seleccionado: {imageName}</p>}
              {imageUrl && (
                <div className="product-image-field-actions">
                  <button className="btn-ghost" type="button" onClick={clearImage}>Quitar imagen</button>
                </div>
              )}
            </div>
            <div className="form-field">
              <label>Categoría</label>
              <select value={category} onChange={e => setCategory(e.target.value as ProductCategory)}>
                <option value="FOOD">Comida</option>
                <option value="DRINK">Bebida</option>
              </select>
            </div>
            <div className="form-field">
              <label>Destino del Pedido</label>
              <select value={orderTarget} onChange={e => setOrderTarget(e.target.value)}>
                <option value="KITCHEN">Cocina</option>
                <option value="STAFF">Sala</option>
                <option value="BOTH">Ambos</option>
              </select>
            </div>
          </div>
          <div className="form-actions product-form-actions">
            <button className="btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Creando...' : 'Crear Producto'}
            </button>
            <button className="btn-ghost" type="button" onClick={() => router.back()}>
              Cancelar
            </button>
          </div>
        </form>

        <aside className="product-preview-card" aria-label="Vista previa del producto">
          <div className="product-preview-media">
            {imageUrl ? <img src={imageUrl} alt={name || 'Vista previa del producto'} /> : <span>Sin imagen</span>}
          </div>
          <div className="product-preview-body">
            <div className="product-preview-badges">
              <span className="product-preview-badge">{category === 'DRINK' ? 'Bebida' : 'Comida'}</span>
              <span className="product-preview-badge product-preview-badge--muted">
                {orderTarget === 'KITCHEN' ? 'Cocina' : orderTarget === 'STAFF' ? 'Sala' : 'Ambos'}
              </span>
            </div>
            <h2>{name || 'Nombre del producto'}</h2>
            <p>{description || 'La descripción aparecerá aquí para comprobar de un vistazo cómo se leerá en la tarjeta.'}</p>
            <strong>{price ? `${Number(price).toFixed(2)} €` : '0.00 €'}</strong>
          </div>
        </aside>
      </div>

      <AppToastStack toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default CreateProductPage;

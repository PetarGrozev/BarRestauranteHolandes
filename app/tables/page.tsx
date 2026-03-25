"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DiningTable, TableArea } from '@/types';

const TABLE_AREA_LABELS: Record<TableArea, string> = {
  INTERIOR: 'Interior',
  TERRACE: 'Terraza',
};

const TablesPage = () => {
  const router = useRouter();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTableArea, setActiveTableArea] = useState<TableArea>('INTERIOR');

  useEffect(() => {
    fetch('/api/tables')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load tables');
        }
        return response.json();
      })
      .then(data => {
        const nextTables = (data.tables ?? []) as DiningTable[];
        setTables(nextTables);

        if (nextTables.some(table => table.area === 'INTERIOR')) {
          setActiveTableArea('INTERIOR');
        } else if (nextTables.some(table => table.area === 'TERRACE')) {
          setActiveTableArea('TERRACE');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const availableAreas = useMemo(() => {
    return ['INTERIOR', 'TERRACE'].filter(area => tables.some(table => table.area === area)) as TableArea[];
  }, [tables]);

  const visibleTables = useMemo(() => {
    return tables.filter(table => table.area === activeTableArea);
  }, [activeTableArea, tables]);

  return (
    <div className="tables-page">
      <div className="tables-page-header">
        <h1>Selecciona Mesa</h1>
        <p className="page-subtitle">Primero eliges la mesa y luego pasas directamente al pedido</p>
      </div>

      <section className="table-selector-card">
        <div className="order-section-header">
          <h2>Mesas disponibles</h2>
          <span className="order-section-count">Paso 1 de 2</span>
        </div>

        {loading ? (
          <p>Cargando mesas...</p>
        ) : availableAreas.length === 0 ? (
          <div className="empty-state order-empty-state">
            <p>No hay mesas configuradas todavía.</p>
            <a className="btn-primary" href="/admin/tables">Configurar Mesas</a>
          </div>
        ) : (
          <>
            <div className="order-section-tabs table-area-tabs" role="tablist" aria-label="Zonas de mesas">
              {availableAreas.map(area => (
                <button
                  key={area}
                  className={`order-section-tab${activeTableArea === area ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => setActiveTableArea(area)}
                >
                  {TABLE_AREA_LABELS[area]}
                </button>
              ))}
            </div>

            <div className="table-grid table-grid--selector">
              {visibleTables.map(table => (
                <button
                  key={table.id}
                  className="table-button table-button--selector"
                  type="button"
                  onClick={() => router.push(`/order?tableId=${table.id}`)}
                >
                  <span className="table-button-title">Mesa {table.number}</span>
                  <span className="table-button-meta">{TABLE_AREA_LABELS[table.area]}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default TablesPage;
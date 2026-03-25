"use client";

import { useEffect, useState } from 'react';
import type { DiningTable } from '@/types';

type TablesResponse = {
  tables: DiningTable[];
  interiorCount: number;
  terraceCount: number;
  interiorNumbers: number[];
  terraceNumbers: number[];
};

function formatNumbers(numbers: number[]) {
  return numbers.join(', ');
}

function parseNumbers(value: string) {
  return value
    .split(/[\s,;]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => Number(item));
}

function isValidNumbers(numbers: number[]) {
  return numbers.every(number => Number.isInteger(number) && number > 0) && new Set(numbers).size === numbers.length;
}

const AdminTablesPage = () => {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [interiorNumbers, setInteriorNumbers] = useState('');
  const [terraceNumbers, setTerraceNumbers] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/tables')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed');
        }
        return response.json() as Promise<TablesResponse>;
      })
      .then(data => {
        setTables(data.tables);
        setInteriorNumbers(formatNumbers(data.interiorNumbers));
        setTerraceNumbers(formatNumbers(data.terraceNumbers));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const nextInteriorNumbers = parseNumbers(interiorNumbers);
    const nextTerraceNumbers = parseNumbers(terraceNumbers);

    if (
      !isValidNumbers(nextInteriorNumbers) ||
      !isValidNumbers(nextTerraceNumbers) ||
      nextInteriorNumbers.length + nextTerraceNumbers.length === 0
    ) {
      alert('Introduce números únicos y válidos. Puedes separarlos por comas, espacios o saltos de línea.');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interiorNumbers: nextInteriorNumbers,
          terraceNumbers: nextTerraceNumbers,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed');
      }

      const data = (await response.json()) as TablesResponse;
      setTables(data.tables);
      setInteriorNumbers(formatNumbers(data.interiorNumbers));
      setTerraceNumbers(formatNumbers(data.terraceNumbers));
    } catch {
      alert('Error al guardar la configuración de mesas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-tables-page">
      <h1>Configuración de Mesas</h1>
      <p className="page-subtitle">Escribe los números de mesa manualmente para interior y terraza. Cada zona puede tener numeración distinta.</p>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-field">
          <label>Números de Interior</label>
          <textarea
            value={interiorNumbers}
            onChange={event => setInteriorNumbers(event.target.value)}
            placeholder="Ejemplo: 1, 2, 4, 8"
            rows={4}
          />
          <p className="form-help-text">Puedes separar por comas, espacios o saltos de línea.</p>
        </div>
        <div className="form-field">
          <label>Números de Terraza</label>
          <textarea
            value={terraceNumbers}
            onChange={event => setTerraceNumbers(event.target.value)}
            placeholder="Ejemplo: 101, 102, 201"
            rows={4}
          />
          <p className="form-help-text">La numeración de terraza puede ser totalmente distinta a interior.</p>
        </div>
        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>

      <section className="tables-preview-section">
        <div className="tables-preview-header">
          <h2>Mesas Actuales</h2>
          {!loading && <span>{tables.length} mesas</span>}
        </div>
        {loading ? (
          <p>Cargando mesas...</p>
        ) : tables.length === 0 ? (
          <p className="empty-state">Aún no hay mesas configuradas</p>
        ) : (
          <>
            <div className="tables-number-summary">
              <div className="tables-number-block">
                <strong>Interior</strong>
                <span>{formatNumbers(tables.filter(table => table.area === 'INTERIOR').map(table => table.number)) || 'Sin mesas'}</span>
              </div>
              <div className="tables-number-block">
                <strong>Terraza</strong>
                <span>{formatNumbers(tables.filter(table => table.area === 'TERRACE').map(table => table.number)) || 'Sin mesas'}</span>
              </div>
            </div>
            <div className="tables-preview-grid">
              {tables.map(table => (
                <div key={table.id} className={`table-preview-card table-preview-card--${table.area.toLowerCase()}`}>
                  <strong>Mesa {table.number}</strong>
                  <span>{table.area === 'TERRACE' ? 'Terraza' : 'Interior'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default AdminTablesPage;
"use client";

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import AppToastStack from '@/components/AppToast';
import useAppToasts from '@/hooks/useAppToasts';
import { getCustomerTableUrl } from '@/lib/tableLinks';
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

const AdminTablesPage = () => {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [interiorCount, setInteriorCount] = useState('0');
  const [terraceCount, setTerraceCount] = useState('0');
  const [qrCodes, setQrCodes] = useState<Record<number, string>>({});
  const [origin, setOrigin] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toasts, pushToast, removeToast } = useAppToasts();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

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
        setInteriorCount(String(data.interiorCount));
        setTerraceCount(String(data.terraceCount));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!origin || tables.length === 0) {
      setQrCodes({});
      return;
    }

    let cancelled = false;

    Promise.all(
      tables.map(async table => {
        const qrDataUrl = await QRCode.toDataURL(getCustomerTableUrl(origin, table.id), {
          width: 220,
          margin: 1,
        });

        return [table.id, qrDataUrl] as const;
      }),
    )
      .then(entries => {
        if (cancelled) {
          return;
        }

        setQrCodes(Object.fromEntries(entries));
      })
      .catch(() => {
        if (!cancelled) {
          pushToast({ message: 'No se pudieron generar algunos códigos QR.', title: 'Mesas', variant: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [origin, pushToast, tables]);

  const handleCopyQrLink = async (tableId: number) => {
    if (!origin) {
      return;
    }

    try {
      await navigator.clipboard.writeText(getCustomerTableUrl(origin, tableId));
      pushToast({ message: `Enlace de la mesa ${tableId} copiado.`, title: 'QR de mesa', variant: 'success' });
    } catch {
      pushToast({ message: 'No se pudo copiar el enlace de la mesa.', title: 'QR de mesa', variant: 'error' });
    }
  };

  const handlePrintAllQrs = () => {
    window.print();
  };

  const handlePrintSingleQr = (table: DiningTable) => {
    const qrCode = qrCodes[table.id];
    if (!qrCode || !origin) {
      pushToast({ message: 'El QR todavía no está listo para imprimirse.', title: 'QR de mesa', variant: 'error' });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=420,height=640');
    if (!printWindow) {
      pushToast({ message: 'No se pudo abrir la ventana de impresión.', title: 'QR de mesa', variant: 'error' });
      return;
    }

    const label = table.area === 'TERRACE' ? 'Terraza' : 'Interior';
    const customerUrl = getCustomerTableUrl(origin, table.id);

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Mesa ${table.number}</title>
          <style>
            body {
              margin: 0;
              font-family: "Segoe UI", sans-serif;
              color: #0f172a;
              background: #ffffff;
            }
            .sheet {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 24px;
            }
            .card {
              width: 100%;
              max-width: 320px;
              border: 2px solid #0f172a;
              border-radius: 18px;
              padding: 24px;
              text-align: center;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 28px;
            }
            p {
              margin: 0 0 14px;
              font-size: 14px;
              color: #475569;
            }
            img {
              width: 100%;
              max-width: 220px;
              height: auto;
              display: block;
              margin: 18px auto;
            }
            .link {
              word-break: break-all;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="card">
              <h1>Mesa ${table.number}</h1>
              <p>${label}</p>
              <img src="${qrCode}" alt="QR Mesa ${table.number}" />
              <p>Escanea para hacer tu pedido</p>
              <p class="link">${customerUrl}</p>
            </div>
          </div>
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    const nextInteriorCount = Number(interiorCount);
    const nextTerraceCount = Number(terraceCount);

    if (
      !Number.isInteger(nextInteriorCount) ||
      !Number.isInteger(nextTerraceCount) ||
      nextInteriorCount < 0 ||
      nextTerraceCount < 0 ||
      nextInteriorCount + nextTerraceCount === 0
    ) {
      pushToast({ message: 'Introduce una cantidad válida para interior y terraza. Al menos una zona debe tener mesas.', title: 'Mesas', variant: 'error' });
      setSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interiorCount: nextInteriorCount,
          terraceCount: nextTerraceCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed');
      }

      const data = (await response.json()) as TablesResponse;
      setTables(data.tables);
      setInteriorCount(String(data.interiorCount));
      setTerraceCount(String(data.terraceCount));
      pushToast({ message: 'Configuración guardada correctamente.', title: 'Mesas', variant: 'success' });
    } catch {
      pushToast({ message: 'Error al guardar la configuración de mesas.', title: 'Mesas', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-tables-page">
      <h1>Configuración de Mesas</h1>
      <p className="page-subtitle">Indica cuántas mesas quieres en interior y cuántas en terraza. El sistema las creará automáticamente de la 1 a la cantidad elegida en cada zona.</p>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="product-form-grid">
          <div className="form-field">
            <label>Mesas de Interior</label>
            <input
              type="number"
              min="0"
              step="1"
              value={interiorCount}
              onChange={event => setInteriorCount(event.target.value)}
              placeholder="0"
            />
            <p className="form-help-text">Se crearán las mesas 1 a {interiorCount || '0'} en interior.</p>
          </div>
          <div className="form-field">
            <label>Mesas de Terraza</label>
            <input
              type="number"
              min="0"
              step="1"
              value={terraceCount}
              onChange={event => setTerraceCount(event.target.value)}
              placeholder="0"
            />
            <p className="form-help-text">Se crearán las mesas 1 a {terraceCount || '0'} en terraza.</p>
          </div>
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
          <div className="tables-preview-toolbar no-print">
            {!loading && <span>{tables.length} mesas</span>}
            {!loading && tables.length > 0 && (
              <button className="btn-secondary" type="button" onClick={handlePrintAllQrs}>
                Imprimir todos los QR
              </button>
            )}
          </div>
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
                  <div className="table-qr-preview">
                    {qrCodes[table.id] ? <img src={qrCodes[table.id]} alt={`QR de la mesa ${table.number}`} /> : <span>Generando QR...</span>}
                  </div>
                  <div className="table-preview-actions">
                    <a className="btn-secondary" href={origin ? getCustomerTableUrl(origin, table.id) : '#'} target="_blank" rel="noreferrer">
                      Abrir enlace cliente
                    </a>
                    <button className="btn-secondary" type="button" onClick={() => handlePrintSingleQr(table)}>
                      Imprimir QR
                    </button>
                    <button className="btn-ghost" type="button" onClick={() => handleCopyQrLink(table.id)}>
                      Copiar enlace QR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <AppToastStack toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default AdminTablesPage;
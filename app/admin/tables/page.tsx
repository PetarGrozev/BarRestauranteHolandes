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

function TableAreaIcon({ area }: { area: DiningTable['area'] }) {
  if (area === 'TERRACE') {
    return (
      <svg aria-hidden="true" className="table-area-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v7" />
        <path d="M8.5 6.5 12 10l3.5-3.5" />
        <path d="M4 10h16" />
        <path d="M7 10l1.2 9h7.6L17 10" />
        <path d="M12 19v2" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="table-area-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21v-8" />
      <path d="M18 21v-8" />
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5V13H4V8.5Z" />
      <path d="M4 13h16" />
    </svg>
  );
}

function TableActionIcon({ kind }: { kind: 'open' | 'print' | 'download' | 'copy' }) {
  if (kind === 'print') {
    return (
      <svg aria-hidden="true" className="table-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 9V4h10v5" />
        <path d="M6 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1" />
        <path d="M7 14h10v6H7z" />
      </svg>
    );
  }

  if (kind === 'download') {
    return (
      <svg aria-hidden="true" className="table-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v11" />
        <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
        <path d="M4 20h16" />
      </svg>
    );
  }

  if (kind === 'copy') {
    return (
      <svg aria-hidden="true" className="table-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="table-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
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

  const sortedTables = [...tables].sort((left, right) => {
    if (left.area !== right.area) {
      return left.area.localeCompare(right.area);
    }

    return left.number - right.number;
  });

  const qrReadyCount = sortedTables.filter(table => Boolean(qrCodes[table.id])).length;
  const openTablesCount = sortedTables.filter(table => table.isOpen).length;

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
          pushToast({ message: 'Sommige QR-codes konden niet worden gegenereerd.', title: 'Tafels', variant: 'error' });
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
      pushToast({ message: `Link van tafel ${tableId} gekopieerd.`, title: 'Tafel-QR', variant: 'success' });
    } catch {
      pushToast({ message: 'De tafellink kon niet worden gekopieerd.', title: 'Tafel-QR', variant: 'error' });
    }
  };

  const handlePrintAllQrs = () => {
    window.print();
  };

  const handlePrintSingleQr = (table: DiningTable) => {
    const qrCode = qrCodes[table.id];
    if (!qrCode || !origin) {
      pushToast({ message: 'De QR-code is nog niet klaar om af te drukken.', title: 'Tafel-QR', variant: 'error' });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=420,height=640');
    if (!printWindow) {
      pushToast({ message: 'Het afdrukvenster kon niet worden geopend.', title: 'Tafel-QR', variant: 'error' });
      return;
    }

    const label = table.area === 'TERRACE' ? 'Terras' : 'Binnen';
    const customerUrl = getCustomerTableUrl(origin, table.id);

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Tafel ${table.number}</title>
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
              <h1>Tafel ${table.number}</h1>
              <p>${label}</p>
              <img src="${qrCode}" alt="QR Tafel ${table.number}" />
              <p>Scan om je bestelling te plaatsen</p>
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

  const handleDownloadSingleQr = (table: DiningTable) => {
    const qrCode = qrCodes[table.id];
    if (!qrCode) {
      pushToast({ message: 'De QR-code is nog niet klaar om te downloaden.', title: 'Tafel-QR', variant: 'error' });
      return;
    }

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `mesa-${table.number}-${table.area.toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
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
      pushToast({ message: 'Voer een geldig aantal in voor binnen en terras. Minstens één zone moet tafels hebben.', title: 'Tafels', variant: 'error' });
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
      pushToast({ message: 'Configuratie succesvol opgeslagen.', title: 'Tafels', variant: 'success' });
    } catch {
      pushToast({ message: 'Het opslaan van de tafelconfiguratie is mislukt.', title: 'Tafels', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-tables-page">
      <h1>Tafelconfiguratie</h1>
      <p className="page-subtitle">Geef aan hoeveel tafels je binnen en op het terras wilt. Het systeem maakt ze automatisch aan van 1 tot het gekozen aantal per zone.</p>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="product-form-grid">
          <div className="form-field">
            <label>Tafels binnen</label>
            <input
              type="number"
              min="0"
              step="1"
              value={interiorCount}
              onChange={event => setInteriorCount(event.target.value)}
              placeholder="0"
            />
            <p className="form-help-text">Tafels 1 t/m {interiorCount || '0'} worden binnen aangemaakt.</p>
          </div>
          <div className="form-field">
            <label>Tafels terras</label>
            <input
              type="number"
              min="0"
              step="1"
              value={terraceCount}
              onChange={event => setTerraceCount(event.target.value)}
              placeholder="0"
            />
            <p className="form-help-text">Tafels 1 t/m {terraceCount || '0'} worden op het terras aangemaakt.</p>
          </div>
        </div>
        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Opslaan...' : 'Configuratie opslaan'}
          </button>
        </div>
      </form>

      <section className="tables-preview-section">
        <div className="tables-preview-header">
          <h2>Huidige tafels</h2>
          <div className="tables-preview-toolbar no-print">
            {!loading && <span>{tables.length} tafels</span>}
            {!loading && tables.length > 0 && (
              <button className="btn-secondary" type="button" onClick={handlePrintAllQrs}>
                <TableActionIcon kind="print" />
                Alle QR-codes afdrukken
              </button>
            )}
          </div>
        </div>
        {loading ? (
          <p>Tafels laden...</p>
        ) : tables.length === 0 ? (
          <p className="empty-state">Er zijn nog geen tafels ingesteld</p>
        ) : (
          <>
            <div className="tables-stats-grid">
              <div className="tables-stat-card">
                <strong>{sortedTables.length}</strong>
                <span>Actieve tafels op de plattegrond</span>
              </div>
              <div className="tables-stat-card">
                <strong>{openTablesCount}</strong>
                <span>Tafels die nu open zijn</span>
              </div>
              <div className="tables-stat-card">
                <strong>{qrReadyCount}</strong>
                <span>QR-codes klaar om af te drukken of te downloaden</span>
              </div>
            </div>
            <div className="tables-number-summary">
              <div className="tables-number-block">
                <strong>Binnen</strong>
                <span>{formatNumbers(tables.filter(table => table.area === 'INTERIOR').map(table => table.number)) || 'Geen tafels'}</span>
              </div>
              <div className="tables-number-block">
                <strong>Terras</strong>
                <span>{formatNumbers(tables.filter(table => table.area === 'TERRACE').map(table => table.number)) || 'Geen tafels'}</span>
              </div>
            </div>
            <div className="tables-preview-grid">
              {sortedTables.map(table => (
                <div key={table.id} className={`table-preview-card table-preview-card--${table.area.toLowerCase()}`} data-print-label={`Tafel ${table.number}`}>
                  <div className="table-preview-card-header">
                    <div className="table-preview-card-heading">
                      <span className="table-preview-area-badge">
                        <TableAreaIcon area={table.area} />
                        {table.area === 'TERRACE' ? 'Terras' : 'Binnen'}
                      </span>
                      <strong>Tafel {table.number}</strong>
                    </div>
                    <span className={`table-preview-status table-preview-status--${table.isOpen ? 'open' : 'closed'}`}>
                      {table.isOpen ? 'Open' : 'Vrij'}
                    </span>
                  </div>
                  <div className="table-qr-preview">
                    {qrCodes[table.id] ? <img src={qrCodes[table.id]} alt={`QR van tafel ${table.number}`} /> : <span>QR genereren...</span>}
                  </div>
                  <div className="table-print-copy">
                    <strong>Scan en bestel</strong>
                    <span>{table.area === 'TERRACE' ? 'Terras' : 'Binnen'}</span>
                  </div>
                  <div className="table-preview-link-block">
                    <strong>Klantroute</strong>
                    <span>{getCustomerTableUrl(origin || 'https://tu-dominio.com', table.id)}</span>
                  </div>
                  <div className="table-preview-actions">
                    <a className="btn-secondary" href={origin ? getCustomerTableUrl(origin, table.id) : '#'} target="_blank" rel="noreferrer">
                      <TableActionIcon kind="open" />
                      Klantbestelling openen
                    </a>
                    <button className="btn-secondary" type="button" onClick={() => handlePrintSingleQr(table)}>
                      <TableActionIcon kind="print" />
                      QR afdrukken
                    </button>
                    <button className="btn-secondary" type="button" onClick={() => handleDownloadSingleQr(table)}>
                      <TableActionIcon kind="download" />
                      PNG downloaden
                    </button>
                    <button className="btn-ghost" type="button" onClick={() => handleCopyQrLink(table.id)}>
                      <TableActionIcon kind="copy" />
                      QR-link kopiëren
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
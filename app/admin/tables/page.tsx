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
          width: 600,
          margin: 2,
          color: { dark: '#1a1109', light: '#ffffff' },
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
    if (sortedTables.length === 0) return;

    const notReady = sortedTables.some(t => !qrCodes[t.id]);
    if (notReady) {
      pushToast({ message: 'Wacht tot alle QR-codes zijn geladen.', title: 'Tafel-QR', variant: 'error' });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      pushToast({ message: 'Het afdrukvenster kon niet worden geopend.', title: 'Tafel-QR', variant: 'error' });
      return;
    }

    const cardsHtml = sortedTables.map(table => {
      const label = table.area === 'TERRACE' ? 'Terras' : 'Binnen';
      const qrCode = qrCodes[table.id];
      return `
        <div class="card">
          <div class="card-header">
            <span class="brand-name">Bar &amp; Restaurant</span>
            <div class="brand-rule"></div>
            <span class="table-label">Tafel</span>
            <span class="table-number">${table.number}</span>
            <span class="area-tag">${label}</span>
          </div>
          <div class="card-body">
            <div class="qr-wrap">
              <img src="${qrCode}" alt="QR Tafel ${table.number}" />
            </div>
            <p class="instruction">Scan om te bestellen</p>
          </div>
        </div>`;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="nl">
        <head>
          <meta charset="utf-8" />
          <title>QR-codes alle tafels</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            @page { size: A4 portrait; margin: 12mm; }
            body {
              font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
              background: #fff;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 86mm);
              gap: 8mm;
              justify-content: center;
            }
            .card {
              width: 86mm;
              break-inside: avoid;
              border: 1.5px solid #1a1109;
              border-radius: 4mm;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .card-header {
              width: 100%;
              background: #1a1109;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              padding: 5mm 6mm 5mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2mm;
            }
            .brand-name {
              color: #d4a843;
              font-size: 7.5pt;
              font-weight: 700;
              letter-spacing: 0.18em;
              text-transform: uppercase;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .brand-rule {
              width: 18mm;
              height: 0.3mm;
              background: rgba(212,168,67,0.45);
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0.5mm 0;
            }
            .table-label {
              color: rgba(255,255,255,0.45);
              font-size: 7pt;
              font-weight: 700;
              letter-spacing: 0.16em;
              text-transform: uppercase;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .table-number {
              color: #fff;
              font-size: 36pt;
              font-weight: 800;
              line-height: 1;
              letter-spacing: -0.03em;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .area-tag {
              color: rgba(212,168,67,0.75);
              font-size: 7pt;
              font-weight: 600;
              letter-spacing: 0.1em;
              text-transform: uppercase;
              margin-top: 0.5mm;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .card-body {
              width: 100%;
              padding: 5mm 6mm 5mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 3.5mm;
            }
            .qr-wrap {
              width: 58mm;
              height: 58mm;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 2.5mm;
              border: 1px solid #ddd;
              border-radius: 2mm;
              background: #fff;
            }
            .qr-wrap img {
              width: 100%;
              height: auto;
              display: block;
            }
            .instruction {
              font-size: 9.5pt;
              font-weight: 600;
              color: #1a1109;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${cardsHtml}
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
      <!DOCTYPE html>
      <html lang="nl">
        <head>
          <meta charset="utf-8" />
          <title>QR Tafel ${table.number}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            @page { size: A5; margin: 0; }
            body {
              width: 148mm;
              min-height: 210mm;
              font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
              background: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 12mm;
            }
            .card {
              width: 100%;
              max-width: 112mm;
              border: 1.5px solid #1a1109;
              border-radius: 5mm;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .card-header {
              width: 100%;
              background: #1a1109;
              padding: 9mm 8mm 8mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2.5mm;
            }
            .brand-name {
              color: #d4a843;
              font-size: 8pt;
              font-weight: 700;
              letter-spacing: 0.18em;
              text-transform: uppercase;
            }
            .brand-rule {
              width: 20mm;
              height: 0.3mm;
              background: rgba(212,168,67,0.45);
              margin: 1mm 0;
            }
            .table-label {
              color: rgba(255,255,255,0.45);
              font-size: 7pt;
              font-weight: 700;
              letter-spacing: 0.16em;
              text-transform: uppercase;
            }
            .table-number {
              color: #fff;
              font-size: 52pt;
              font-weight: 800;
              line-height: 1;
              letter-spacing: -0.03em;
            }
            .area-tag {
              color: rgba(212,168,67,0.75);
              font-size: 7.5pt;
              font-weight: 600;
              letter-spacing: 0.1em;
              text-transform: uppercase;
              margin-top: 1mm;
            }
            .card-body {
              width: 100%;
              padding: 7mm 8mm 6mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 5mm;
            }
            .qr-wrap {
              width: 70mm;
              height: 70mm;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 3mm;
              border: 1px solid #ddd;
              border-radius: 2.5mm;
              background: #fff;
            }
            .qr-wrap img {
              width: 100%;
              height: auto;
              display: block;
            }
            .instruction {
              font-size: 12pt;
              font-weight: 600;
              color: #1a1109;
              text-align: center;
              letter-spacing: -0.01em;
            }
            .card-footer {
              width: 100%;
              background: #f7f5f1;
              border-top: 1px solid #e6e2d8;
              padding: 4mm 8mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1.5mm;
            }
            .footer-label {
              font-size: 6pt;
              color: #aaa;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.12em;
            }
            .footer-url {
              font-size: 7pt;
              color: #777;
              word-break: break-all;
              text-align: center;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="card-header">
              <span class="brand-name">Bar &amp; Restaurant</span>
              <div class="brand-rule"></div>
              <span class="table-label">Tafel</span>
              <span class="table-number">${table.number}</span>
              <span class="area-tag">${label}</span>
            </div>
            <div class="card-body">
              <div class="qr-wrap">
                <img src="${qrCode}" alt="QR Tafel ${table.number}" />
              </div>
              <p class="instruction">Scan om te bestellen</p>
            </div>
            <div class="card-footer">
              <span class="footer-label">URL</span>
              <span class="footer-url">${customerUrl}</span>
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
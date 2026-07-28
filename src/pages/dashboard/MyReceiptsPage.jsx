import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import useUIStore from '../../stores/uiStore.js';
import { getMyReceipts, getReceiptFilters } from '../../api/contractor.js';

const content = {
  en: {
    title: 'My Receipts',
    subtitle: (n) => `${n} receipt${n !== 1 ? 's' : ''} found`,
    empty: 'No receipts found. Try adjusting your filters or check back after payments are approved.',
    back: '← Dashboard',
    preview: 'Preview',
    download: 'Download PDF',
    status: { paid: 'Paid', approved: 'Approved', pending: 'Pending' },
    modal: { title: 'Receipt', close: 'Close', download: 'Download PDF' },
    search: {
      placeholder_trade: 'All trade professionals',
      placeholder_site: 'All projects',
      label_trade: 'Trade professional',
      label_site: 'Project / site',
      label_from: 'From',
      label_to: 'To',
      btn_clear: 'Clear',
      no_trades: 'No trades with orders yet',
      no_sites: 'No projects yet',
    },
  },
  es: {
    title: 'Mis Recibos',
    subtitle: (n) => `${n} recibo${n !== 1 ? 's' : ''} encontrado${n !== 1 ? 's' : ''}`,
    empty: 'Sin recibos. Ajusta los filtros o vuelve después de que se aprueben los pagos.',
    back: '← Panel',
    preview: 'Ver',
    download: 'Descargar PDF',
    status: { paid: 'Pagado', approved: 'Aprobado', pending: 'Pendiente' },
    modal: { title: 'Recibo', close: 'Cerrar', download: 'Descargar PDF' },
    search: {
      placeholder_trade: 'Todos los profesionales',
      placeholder_site: 'Todos los proyectos',
      label_trade: 'Profesional',
      label_site: 'Proyecto / sitio',
      label_from: 'Desde',
      label_to: 'Hasta',
      btn_clear: 'Limpiar',
      no_trades: 'Aún no hay oficios con órdenes',
      no_sites: 'Aún no hay proyectos',
    },
  },
};

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });
}

function statusPill(status) {
  if (status === 'paid')     return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'approved') return 'bg-sky-100 text-sky-700 border-sky-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

function generatePDF(r) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 0;

  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, W, 60, 'F');
  doc.setFillColor(14, 165, 233);
  doc.rect(W / 2, 0, W / 2, 60, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('TradeLink', 40, 38);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Receipt', 40, 52);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(r.receipt_number, W - 40, 38, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Receipt No.', W - 40, 52, { align: 'right' });
  y = 90;

  const rows = [
    ['Trade Professional', r.trade_name            ?? '—'],
    ['Professionality',    r.trade_professionality  ?? '—'],
    ['Site / Project',     r.site_name             ?? '—'],
    ['Address',            r.site_address          ?? '—'],
    ['Date',               fmtDate(r.date)],
    ['Hours Worked',       `${r.actual_hours ?? '—'}h`],
    ['Workers',            String(r.workers_no ?? '—')],
    ['Hourly Rate',        `$${r.hourly_rate ?? '—'}/hr`],
  ];

  doc.setFontSize(10);
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(label, 40, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(value, 220, y);
    y += 20;
  });

  y += 10;
  doc.setDrawColor(134, 239, 172);
  doc.setLineWidth(1);
  doc.line(40, y, W - 40, y);
  y += 22;

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(40, y - 14, W - 80, 36, 6, 6, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text('Total Charged', 56, y + 4);
  doc.text(`$${r.order_sum ?? 0}`, W - 56, y + 4, { align: 'right' });
  y += 40;

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for using TradeLink. Please keep this document as your payment record.', 40, y);

  doc.save(`receipt-${r.receipt_number}-${r.date ?? 'date'}.pdf`);
}

// ── Preview modal ────────────────────────────────────────────────────────────
function ReceiptModal({ r, t, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden overflow-y-auto max-h-[90vh] animate-fade-in">

        <div className="bg-gradient-to-r from-emerald-500 to-sky-500 px-5 sm:px-8 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">TradeLink</p>
              <h2 className="text-xl sm:text-2xl font-extrabold">{t.modal.title}</h2>
              <p className="text-sm opacity-75 mt-0.5">{fmtDate(r.date)}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs opacity-70 mb-0.5">Receipt No.</p>
              <p className="text-base sm:text-lg font-extrabold tracking-wider">{r.receipt_number}</p>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 mt-1 inline-block capitalize">
                {r.paymentStatus ?? 'paid'}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-8 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Trade Pro</p>
              <p className="font-bold text-slate-800 text-sm">{r.trade_name ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.trade_professionality ?? '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Site</p>
              <p className="font-bold text-slate-800 text-sm">{r.site_name ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.site_address ?? '—'}</p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-3">Work Details</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[['⏱️', `${r.actual_hours ?? '—'}h`, 'Hours'], ['👷', r.workers_no ?? '—', 'Workers'], ['💵', `$${r.hourly_rate ?? '—'}/hr`, 'Rate']].map(([icon, val, label]) => (
                <div key={label} className="bg-white rounded-xl py-2 px-1 shadow-sm">
                  <p className="text-lg">{icon}</p>
                  <p className="font-extrabold text-slate-800 text-sm">{val}</p>
                  <p className="text-xs text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 text-center">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Total Charged</p>
            <p className="text-3xl font-extrabold text-emerald-600">${r.order_sum ?? 0}</p>
          </div>
        </div>

        <div className="px-5 sm:px-8 pb-5 sm:pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition">
            {t.modal.close}
          </button>
          <button onClick={() => generatePDF(r)} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 text-white font-semibold text-sm hover:opacity-90 transition shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
            ⬇️ {t.modal.download}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Search panel ─────────────────────────────────────────────────────────────
function SearchPanel({ t, onSearch, loading }) {
  const s = t.search;
  const [trade,    setTrade]    = useState('');
  const [site,     setSite]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // Picker options come from the server so they only ever list trades this
  // contractor actually has orders with, and their real project sites.
  const [options, setOptions] = useState({ trades: [], sites: [] });
  const [optionsLoading, setOptionsLoading] = useState(true);

  useEffect(() => {
    getReceiptFilters()
      .then(setOptions)
      .catch(() => setOptions({ trades: [], sites: [] }))
      .finally(() => setOptionsLoading(false));
  }, []);

  const hasFilters = trade || site || dateFrom || dateTo;

  // Debounce all fields — fire 400 ms after last change
  useEffect(() => {
    const id = setTimeout(() => {
      const params = {};
      if (trade)    params.tradeName = trade;
      if (site)     params.siteName  = site;
      if (dateFrom) params.dateFrom  = dateFrom;
      if (dateTo)   params.dateTo    = dateTo;
      onSearch(params);
    }, 400);
    return () => clearTimeout(id);
  }, [trade, site, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = () => {
    setTrade('');
    setSite('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 mb-6 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Trade professional — only those with orders against this contractor */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">{s.label_trade}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🔧</span>
            <select
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              disabled={optionsLoading}
              className="w-full appearance-none pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-60 disabled:cursor-wait"
            >
              <option value="">{s.placeholder_trade}</option>
              {options.trades.length === 0 && !optionsLoading && (
                <option value="" disabled>{s.no_trades}</option>
              )}
              {options.trades.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}{p.professionality ? ` · ${p.professionality}` : ''}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">▾</span>
          </div>
        </div>

        {/* Project / site — every project card this contractor owns */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">{s.label_site}</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">📍</span>
            <select
              value={site}
              onChange={(e) => setSite(e.target.value)}
              disabled={optionsLoading}
              className="w-full appearance-none pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-60 disabled:cursor-wait"
            >
              <option value="">{s.placeholder_site}</option>
              {options.sites.length === 0 && !optionsLoading && (
                <option value="" disabled>{s.no_sites}</option>
              )}
              {options.sites.map((st) => (
                <option key={st.id} value={st.name}>{st.name}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">▾</span>
          </div>
        </div>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">{s.label_from}</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">{s.label_to}</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
        </div>
      </div>

      {hasFilters && (
        <div className="flex justify-end items-center gap-3 pt-1">
          {loading && (
            <span className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-emerald-500 rounded-full animate-spin" />
          )}
          <button
            onClick={handleClear}
            className="px-5 py-2 rounded-xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-slate-50 transition"
          >
            ✕ {s.btn_clear}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function MyReceiptsPage() {
  const navigate  = useNavigate();
  const lang      = useUIStore((s) => s.lang);
  const t         = content[lang];

  const [receipts, setReceipts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [preview,  setPreview]  = useState(null);

  const fetchReceipts = useCallback((params = {}) => {
    setLoading(true);
    getMyReceipts(params)
      .then(setReceipts)
      .catch(() => setReceipts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-sky-50">

      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10 gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button onClick={() => navigate('/dashboard/contractor')} className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition flex-shrink-0">{t.back}</button>
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <h1 className="text-base sm:text-lg font-extrabold text-slate-800 truncate">🧾 {t.title}</h1>
        </div>
        {!loading && <p className="text-xs sm:text-sm text-slate-400 flex-shrink-0">{t.subtitle(receipts.length)}</p>}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">

        <SearchPanel t={t} onSearch={fetchReceipts} loading={loading} />

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && receipts.length === 0 && (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🧾</div>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">{t.empty}</p>
          </div>
        )}

        {!loading && receipts.length > 0 && (
          <div className="space-y-2 sm:space-y-4">
            {receipts.map((r) => (
              <div key={r._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="flex items-stretch">
                  <div className={`w-1.5 flex-shrink-0 ${r.paymentStatus === 'paid' ? 'bg-emerald-400' : 'bg-amber-300'}`} />
                  <div className="flex-1 p-3 sm:p-5">

                    {/* Primary: site name bold + large. Secondary: trade name bold */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-800 text-sm sm:text-base truncate">📍 {r.site_name ?? '—'}</p>
                        <p className="text-xs font-bold text-slate-600 truncate mt-0.5">
                          🔧 {r.trade_name ?? '—'}
                          {r.trade_professionality ? <span className="font-normal text-slate-400"> · {r.trade_professionality}</span> : ''}
                          {r.site_address ? <span className="hidden sm:inline font-normal text-slate-400"> · {r.site_address}</span> : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-wider">{r.receipt_number}</span>
                        <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${statusPill(r.paymentStatus)}`}>
                          {t.status[r.paymentStatus] ?? r.paymentStatus}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-400">{fmtDate(r.date)}</span>
                      </div>
                    </div>

                    {/* Stat chips */}
                    <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                      {[['⏱️', `${r.actual_hours ?? '—'}h`, 'hours'], ['👷', r.workers_no ?? '—', 'workers'], ['💵', `$${r.hourly_rate ?? '—'}/hr`, 'rate']].map(([icon, val, label]) => (
                        <div key={label} className="flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-0.5 sm:px-2.5 sm:py-1">
                          <span className="text-xs sm:text-sm">{icon}</span>
                          <span className="text-xs font-bold text-slate-700">{val}</span>
                          <span className="text-[10px] sm:text-xs text-slate-400">{label}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5 sm:px-2.5 sm:py-1 ml-auto">
                        <span className="text-[10px] sm:text-xs text-slate-500">Total</span>
                        <span className="text-xs sm:text-sm font-extrabold text-emerald-600">${r.order_sum ?? 0}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-2 sm:mt-4 flex gap-2 justify-end">
                      <button onClick={() => setPreview(r)} className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition active:scale-95">
                        🔍 {t.preview}
                      </button>
                      <button onClick={() => generatePDF(r)} className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 text-white hover:opacity-90 shadow shadow-emerald-100 transition active:scale-95">
                        ⬇️ {t.download}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && <ReceiptModal r={preview} t={t} onClose={() => setPreview(null)} />}
    </div>
  );
}

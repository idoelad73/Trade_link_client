import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import useUIStore from '../../stores/uiStore.js';
import { getMyReceipts } from '../../api/trade.js';

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
      placeholder_contractor: 'Contractor name…',
      placeholder_site: 'Project / site name…',
      label_from: 'From',
      label_to: 'To',
      btn_search: 'Search',
      btn_clear: 'Clear',
      active: 'Active filters',
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
      placeholder_contractor: 'Nombre del contratista…',
      placeholder_site: 'Proyecto / sitio…',
      label_from: 'Desde',
      label_to: 'Hasta',
      btn_search: 'Buscar',
      btn_clear: 'Limpiar',
      active: 'Filtros activos',
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

  doc.setFillColor(14, 165, 233);
  doc.rect(0, 0, W, 60, 'F');
  doc.setFillColor(99, 102, 241);
  doc.rect(W / 2, 0, W / 2, 60, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('TradeLink', 40, 38);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Payment Receipt — Trade Pro', 40, 52);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(r.receipt_number, W - 40, 38, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Receipt No.', W - 40, 52, { align: 'right' });
  y = 90;

  const rows = [
    ['Contractor',     r.contractor_name       ?? '—'],
    ['Site / Project', r.site_name             ?? '—'],
    ['Address',        r.site_address          ?? '—'],
    ['Date',           fmtDate(r.date)],
    ['Hours Worked',   `${r.actual_hours ?? '—'}h`],
    ['Workers',        String(r.workers_no ?? '—')],
    ['Hourly Rate',    `$${r.hourly_rate ?? '—'}/hr`],
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
  doc.setDrawColor(186, 230, 253);
  doc.setLineWidth(1);
  doc.line(40, y, W - 40, y);
  y += 22;

  const totals = [
    ['Order Total',  `$${r.order_sum   ?? 0}`, false],
    ['Platform Fee', `− $${r.fee_sum   ?? 0}`, false],
    ['Your Payout',  `$${r.payment_sum ?? 0}`, true],
  ];
  totals.forEach(([label, value, isLast]) => {
    if (isLast) {
      doc.setFillColor(240, 249, 255);
      doc.roundedRect(40, y - 14, W - 80, 36, 6, 6, 'F');
    }
    doc.setFontSize(isLast ? 13 : 11);
    doc.setFont('helvetica', isLast ? 'bold' : 'normal');
    doc.setTextColor(isLast ? 3 : 71, isLast ? 105 : 85, isLast ? 161 : 105);
    doc.text(label, 56, y + 4);
    doc.setTextColor(15, 23, 42);
    doc.text(value, W - 56, y + 4, { align: 'right' });
    y += isLast ? 40 : 20;
  });

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

        <div className="bg-gradient-to-r from-sky-500 to-indigo-500 px-5 sm:px-8 py-5 text-white">
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
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Contractor</p>
              <p className="font-bold text-slate-800 text-sm">{r.contractor_name ?? '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Site</p>
              <p className="font-bold text-slate-800 text-sm">{r.site_name ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.site_address ?? '—'}</p>
            </div>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-sky-700 uppercase tracking-wide mb-3">Work Details</p>
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

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Order Total</span>
              <span className="font-semibold text-slate-800">${r.order_sum ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Platform Fee</span>
              <span className="text-red-400 font-medium">− ${r.fee_sum ?? 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-700">Your Payout</span>
              <span className="text-2xl font-extrabold text-sky-600">${r.payment_sum ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-8 pb-5 sm:pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition">
            {t.modal.close}
          </button>
          <button onClick={() => generatePDF(r)} className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-semibold text-sm hover:opacity-90 transition shadow-lg shadow-sky-100 flex items-center justify-center gap-2">
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
  const [contractor, setContractor] = useState('');
  const [site,       setSite]       = useState('');
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');

  const hasFilters = contractor || site || dateFrom || dateTo;

  // Debounce text fields — fire 400 ms after last keystroke
  useEffect(() => {
    const id = setTimeout(() => {
      const params = {};
      if (contractor) params.contractorName = contractor;
      if (site)       params.siteName       = site;
      if (dateFrom)   params.dateFrom       = dateFrom;
      if (dateTo)     params.dateTo         = dateTo;
      onSearch(params);
    }, 400);
    return () => clearTimeout(id);
  }, [contractor, site, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = () => {
    setContractor('');
    setSite('');
    setDateFrom('');
    setDateTo('');
    // onSearch({}) will fire via the effect when state settles
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 mb-6 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Contractor name — live search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🏗️</span>
          <input
            type="text"
            value={contractor}
            onChange={(e) => setContractor(e.target.value)}
            placeholder={s.placeholder_contractor}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 placeholder-slate-300"
          />
          {loading && contractor && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-sky-300 border-t-sky-500 rounded-full animate-spin" />
          )}
        </div>
        {/* Site / project name — live search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">📍</span>
          <input
            type="text"
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder={s.placeholder_site}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 placeholder-slate-300"
          />
          {loading && site && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-sky-300 border-t-sky-500 rounded-full animate-spin" />
          )}
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
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1">{s.label_to}</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>
      </div>

      {hasFilters && (
        <div className="flex justify-end pt-1">
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
export default function TradeReceiptsPage() {
  const navigate = useNavigate();
  const lang     = useUIStore((s) => s.lang);
  const t        = content[lang];

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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50">

      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10 gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button onClick={() => navigate('/dashboard/trade')} className="text-sm font-semibold text-sky-600 hover:text-sky-700 transition flex-shrink-0">{t.back}</button>
          <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
          <h1 className="text-base sm:text-lg font-extrabold text-slate-800 truncate">🧾 {t.title}</h1>
        </div>
        {!loading && <p className="text-xs sm:text-sm text-slate-400 flex-shrink-0">{t.subtitle(receipts.length)}</p>}
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">

        <SearchPanel t={t} onSearch={fetchReceipts} loading={loading} />

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
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
                  <div className={`w-1.5 flex-shrink-0 ${r.paymentStatus === 'paid' ? 'bg-sky-400' : 'bg-slate-300'}`} />
                  <div className="flex-1 p-3 sm:p-5">

                    {/* Top row: contractor name + site name (prominent) + meta */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-800 text-sm sm:text-base truncate">📍 {r.site_name ?? '—'}</p>
                        <p className="text-xs font-bold text-slate-600 truncate mt-0.5">🏗️ {r.contractor_name ?? '—'}{r.site_address ? <span className="hidden sm:inline font-normal text-slate-400"> · {r.site_address}</span> : ''}</p>
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
                      <div className="flex items-center gap-1 bg-slate-50 rounded-lg px-2 py-0.5 sm:px-2.5 sm:py-1">
                        <span className="text-[10px] sm:text-xs text-slate-400 line-through">${r.order_sum ?? 0}</span>
                        <span className="text-[10px] sm:text-xs text-red-400 font-medium">−${r.fee_sum ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-sky-50 border border-sky-100 rounded-lg px-2 py-0.5 sm:px-2.5 sm:py-1 ml-auto">
                        <span className="text-[10px] sm:text-xs text-slate-500">Payout</span>
                        <span className="text-xs sm:text-sm font-extrabold text-sky-600">${r.payment_sum ?? 0}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-2 sm:mt-4 flex gap-2 justify-end">
                      <button onClick={() => setPreview(r)} className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition active:scale-95">
                        🔍 {t.preview}
                      </button>
                      <button onClick={() => generatePDF(r)} className="flex items-center gap-1 sm:gap-1.5 text-xs font-semibold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white hover:opacity-90 shadow shadow-sky-100 transition active:scale-95">
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

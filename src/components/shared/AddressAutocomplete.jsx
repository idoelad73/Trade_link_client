/**
 * AddressAutocomplete — US address lookup via Photon (photon.komoot.io)
 * Results always shown in a modal:
 *   • Mobile  → bottom-sheet (slides up)
 *   • Desktop → small centred panel
 */
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const PHOTON = 'https://photon.komoot.io/api/';

function fmtAddr(p) {
  const parts = [];
  if (p.housenumber && p.street) parts.push(`${p.housenumber} ${p.street}`);
  else if (p.street)             parts.push(p.street);
  else if (p.name)               parts.push(p.name);
  if (p.city)     parts.push(p.city);
  if (p.state)    parts.push(p.state);
  if (p.postcode) parts.push(p.postcode);
  return parts.join(', ');
}

// ── Results modal (works on every device) ───────────────────────────────────
function ResultsModal({ items, query, onPick, onClose }) {
  return createPortal(
    <div
      className="fixed inset-0 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-6"
      style={{ zIndex: 999999, background: 'rgba(0,0,0,0.5)' }}
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Sheet / panel */}
      <div
        className="bg-white w-full rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '75vh', animation: 'addr-rise 0.2s ease-out' }}
      >
        {/* Handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="min-w-0 pr-3">
            <p className="font-extrabold text-slate-800 text-base leading-tight">Select Address</p>
            {query && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">Results for "{query}"</p>
            )}
          </div>
          <button
            onPointerDown={onClose}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Address list */}
        <ul className="overflow-y-auto flex-1 divide-y divide-slate-100">
          {items.map((addr) => (
            <li key={addr}>
              <button
                onPointerDown={() => onPick(addr)}
                className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-amber-50 active:bg-amber-50 transition-colors"
              >
                <span className="text-amber-400 text-lg flex-shrink-0 mt-0.5">📍</span>
                <span className="text-sm text-slate-700 leading-snug">{addr}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-400 py-3 border-t border-slate-100 flex-shrink-0">
          Powered by{' '}
          <a href="https://photon.komoot.io" target="_blank" rel="noreferrer" className="underline">
            Photon / OpenStreetMap
          </a>
        </p>
      </div>

      <style>{`
        @keyframes addr-rise {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AddressAutocomplete({
  value       = '',
  onChange,
  placeholder = '123 Main St, New York, NY 10001',
  inputCls    = '',
  required    = false,
  id,
}) {
  const [text,      setText]      = useState(value);
  const [items,     setItems]     = useState([]);
  const [busy,      setBusy]      = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [lastQuery, setLastQuery] = useState('');

  const inputRef = useRef(null);
  const timer    = useRef(null);
  const ctrl     = useRef(null);

  useEffect(() => { setText(value); }, [value]);

  async function doSearch(q) {
    if (ctrl.current) ctrl.current.abort();
    ctrl.current = new AbortController();
    setBusy(true);
    setItems([]);
    setLastQuery(q);
    try {
      const res  = await fetch(
        `${PHOTON}?q=${encodeURIComponent(q)}&countrycode=us&limit=6&lang=en`,
        { signal: ctrl.current.signal }
      );
      const data = await res.json();
      const list = (data.features || [])
        .map(f => fmtAddr(f.properties))
        .filter(Boolean)
        .filter((a, i, arr) => arr.indexOf(a) === i);
      setItems(list);
      if (list.length > 0) setShowModal(true);
    } catch (e) {
      if (e.name !== 'AbortError') setItems([]);
    } finally {
      setBusy(false);
    }
  }

  function handleInput(e) {
    const q = e.target.value;
    setText(q);
    onChange(q);
    clearTimeout(timer.current);
    setShowModal(false);
    setItems([]);
    if (q.trim().length < 3) return;
    timer.current = setTimeout(() => doSearch(q.trim()), 400);
  }

  function pick(addr) {
    setText(addr);
    onChange(addr);
    setShowModal(false);
    setItems([]);
  }

  function handleKey(e) {
    if (e.key === 'Escape') { setShowModal(false); setItems([]); }
  }

  const charsLeft = 3 - text.trim().length;
  const showHint  = text.trim().length > 0 && charsLeft > 0;

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          required={required}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className={inputCls}
        />

        {busy && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', right: 12, top: '50%', marginTop: -7,
              width: 14, height: 14,
              border: '2px solid #f59e0b', borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'addr-spin 0.65s linear infinite',
              display: 'inline-block',
            }}
          />
        )}
      </div>

      {busy && <p className="text-[11px] text-amber-500 font-medium mt-1 ml-1">Searching…</p>}
      {!busy && showHint && (
        <p className="text-[11px] text-slate-400 mt-1 ml-1">
          Type {charsLeft} more character{charsLeft !== 1 ? 's' : ''} to search…
        </p>
      )}

      {showModal && items.length > 0 && (
        <ResultsModal
          items={items}
          query={lastQuery}
          onPick={pick}
          onClose={() => { setShowModal(false); setItems([]); }}
        />
      )}

      <style>{`@keyframes addr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

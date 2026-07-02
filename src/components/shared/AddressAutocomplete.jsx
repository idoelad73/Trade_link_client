/**
 * AddressAutocomplete — US address lookup via Photon (photon.komoot.io)
 * Desktop: inline dropdown  |  Mobile: full bottom-sheet modal
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

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const fn = (e) => setMobile(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return mobile;
}

// ── Mobile bottom-sheet modal ────────────────────────────────────────────────
function MobileModal({ items, query, onPick, onClose }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.45)' }}
    >
      {/* Backdrop tap closes */}
      <div className="absolute inset-0" onPointerDown={onClose} />

      <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[75vh] animate-slide-up">

        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="font-extrabold text-slate-800 text-base">Select Address</p>
            {query && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[240px]">Results for "{query}"</p>}
          </div>
          <button
            onPointerDown={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-lg font-bold leading-none"
          >
            ✕
          </button>
        </div>

        {/* Address list */}
        <ul className="overflow-y-auto flex-1 divide-y divide-slate-100 px-2 py-2">
          {items.map((addr) => (
            <li key={addr}>
              <button
                onPointerDown={() => onPick(addr)}
                className="w-full flex items-start gap-3 px-3 py-3.5 rounded-xl text-left active:bg-amber-50 transition-colors"
              >
                <span className="text-amber-400 text-lg flex-shrink-0 mt-0.5">📍</span>
                <span className="text-sm text-slate-700 leading-snug">{addr}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <p className="text-[10px] text-slate-400 text-center">
            Powered by{' '}
            <a href="https://photon.komoot.io" target="_blank" rel="noreferrer" className="underline">
              Photon / OpenStreetMap
            </a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.22s ease-out; }
      `}</style>
    </div>,
    document.body
  );
}

// ── Desktop dropdown ─────────────────────────────────────────────────────────
function DesktopDropdown({ items, hi, dropPos, onPick, onHover }) {
  if (!items.length || !dropPos) return null;
  return createPortal(
    <ul
      style={{
        position: 'fixed',
        top:      dropPos.top,
        left:     dropPos.left,
        width:    dropPos.width,
        zIndex:   99999,
      }}
      className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-sm"
    >
      {items.map((addr, i) => (
        <li
          key={addr}
          onPointerDown={(e) => { e.preventDefault(); onPick(addr); }}
          onMouseEnter={() => onHover(i)}
          className={[
            'flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors',
            i === hi ? 'bg-amber-50 text-amber-800' : 'text-slate-700 hover:bg-slate-50',
            i > 0 ? 'border-t border-slate-100' : '',
          ].join(' ')}
        >
          <span className="flex-shrink-0 text-amber-400">📍</span>
          <span className="truncate">{addr}</span>
        </li>
      ))}
      <li className="px-4 py-1.5 text-[10px] text-slate-400 border-t border-slate-100">
        Powered by{' '}
        <a href="https://photon.komoot.io" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">
          Photon / OpenStreetMap
        </a>
      </li>
    </ul>,
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
  const isMobile = useIsMobile();

  const [text,       setText]       = useState(value);
  const [items,      setItems]      = useState([]);
  const [busy,       setBusy]       = useState(false);
  const [hi,         setHi]         = useState(-1);
  const [dropPos,    setDropPos]    = useState(null);
  const [showModal,  setShowModal]  = useState(false);
  const [lastQuery,  setLastQuery]  = useState('');

  const inputRef = useRef(null);
  const timer    = useRef(null);
  const ctrl     = useRef(null);

  useEffect(() => { setText(value); }, [value]);

  // Close desktop dropdown on outside click
  useEffect(() => {
    if (isMobile) return;
    const fn = (e) => {
      if (inputRef.current && !inputRef.current.closest('[data-addr-root]').contains(e.target)) {
        setItems([]);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [isMobile]);

  // Keep desktop dropdown position fresh
  useEffect(() => {
    if (isMobile || items.length === 0) return;
    const update = () => {
      if (!inputRef.current) return;
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    window.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isMobile, items.length]);

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
      setHi(-1);

      if (list.length > 0) {
        if (isMobile) {
          setShowModal(true);
        } else {
          if (inputRef.current) {
            const r = inputRef.current.getBoundingClientRect();
            setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
          }
        }
      }
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
    setItems([]);
    setShowModal(false);
    if (q.trim().length < 3) return;
    timer.current = setTimeout(() => doSearch(q.trim()), 400);
  }

  function pick(addr) {
    setText(addr);
    onChange(addr);
    setItems([]);
    setShowModal(false);
    setHi(-1);
  }

  function handleKey(e) {
    if      (e.key === 'ArrowDown')        { e.preventDefault(); setHi(h => Math.min(h + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp')          { e.preventDefault(); setHi(h => Math.max(h - 1, -1)); }
    else if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); pick(items[hi]); }
    else if (e.key === 'Escape')           { setItems([]); setShowModal(false); }
  }

  const charsLeft = 3 - text.trim().length;
  const showHint  = text.trim().length > 0 && charsLeft > 0;

  return (
    <div className="relative" data-addr-root>

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

      {/* Mobile: bottom-sheet modal */}
      {isMobile && showModal && items.length > 0 && (
        <MobileModal
          items={items}
          query={lastQuery}
          onPick={pick}
          onClose={() => { setShowModal(false); setItems([]); }}
        />
      )}

      {/* Desktop: fixed dropdown */}
      {!isMobile && (
        <DesktopDropdown
          items={items}
          hi={hi}
          dropPos={dropPos}
          onPick={pick}
          onHover={setHi}
        />
      )}

      <style>{`@keyframes addr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

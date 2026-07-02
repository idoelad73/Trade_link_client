/**
 * AddressAutocomplete — US address lookup via Photon (photon.komoot.io)
 * Free · No API key · OpenStreetMap data
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

export default function AddressAutocomplete({
  value       = '',
  onChange,
  placeholder = '123 Main St, New York, NY 10001',
  inputCls    = '',
  required    = false,
  id,
}) {
  const [text,    setText]    = useState(value);
  const [items,   setItems]   = useState([]);
  const [busy,    setBusy]    = useState(false);
  const [hi,      setHi]      = useState(-1);
  const [dropPos, setDropPos] = useState(null);

  const inputRef = useRef(null);
  const timer    = useRef(null);
  const ctrl     = useRef(null);

  // Sync if parent resets the value externally
  useEffect(() => { setText(value); }, [value]);

  // Close dropdown on outside click / touch
  useEffect(() => {
    const fn = (e) => {
      if (inputRef.current && !inputRef.current.parentNode.contains(e.target)) {
        setItems([]);
      }
    };
    document.addEventListener('mousedown', fn);
    document.addEventListener('touchstart', fn);
    return () => {
      document.removeEventListener('mousedown', fn);
      document.removeEventListener('touchstart', fn);
    };
  }, []);

  function getPos() {
    if (!inputRef.current) return null;
    // Use visualViewport when available — gives the correct origin on mobile
    // after the soft keyboard shifts the layout viewport.
    const r      = inputRef.current.getBoundingClientRect();
    const vvTop  = window.visualViewport ? window.visualViewport.offsetTop  : 0;
    const vvLeft = window.visualViewport ? window.visualViewport.offsetLeft : 0;
    return {
      top:   r.bottom + 4 - vvTop,
      left:  r.left        - vvLeft,
      width: r.width,
    };
  }

  // Reposition while the dropdown is open (handles scroll, resize, mobile keyboard)
  useEffect(() => {
    if (items.length === 0) return;

    const update = () => {
      const p = getPos();
      if (p) setDropPos(p);
    };

    // Capture-phase scroll catches any scrolling ancestor
    window.addEventListener('scroll',  update, { passive: true, capture: true });
    window.addEventListener('resize',  update, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update);
      window.visualViewport.addEventListener('scroll', update);
    }

    return () => {
      window.removeEventListener('scroll',  update, true);
      window.removeEventListener('resize',  update);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', update);
        window.visualViewport.removeEventListener('scroll', update);
      }
    };
  }, [items.length]);

  async function doSearch(q) {
    if (ctrl.current) ctrl.current.abort();
    ctrl.current = new AbortController();
    setBusy(true);
    setItems([]);
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
      // Calculate fresh position right after results arrive
      if (list.length > 0) {
        const p = getPos();
        if (p) setDropPos(p);
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
    if (q.trim().length < 3) return;
    timer.current = setTimeout(() => doSearch(q.trim()), 400);
  }

  function pick(addr) {
    setText(addr);
    onChange(addr);
    setItems([]);
    setHi(-1);
  }

  function handleKey(e) {
    if      (e.key === 'ArrowDown')         { e.preventDefault(); setHi(h => Math.min(h + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp')           { e.preventDefault(); setHi(h => Math.max(h - 1, -1)); }
    else if (e.key === 'Enter' && hi >= 0)  { e.preventDefault(); pick(items[hi]); }
    else if (e.key === 'Escape')            { setItems([]); }
  }

  const charsLeft = 3 - text.trim().length;
  const showHint  = text.trim().length > 0 && charsLeft > 0;

  const dropdown = items.length > 0 && dropPos ? (
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
          // onPointerDown instead of onMouseDown — fires on both touch and mouse,
          // and preventDefault prevents the input losing focus on touch devices
          onPointerDown={(e) => { e.preventDefault(); pick(addr); }}
          onMouseEnter={() => setHi(i)}
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
        <a href="https://photon.komoot.io" target="_blank" rel="noreferrer"
           className="underline hover:text-slate-600">
          Photon / OpenStreetMap
        </a>
      </li>
    </ul>
  ) : null;

  return (
    <div className="relative">

      {/* ── Input row ── */}
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
              position: 'absolute', right: 12, top: '50%',
              marginTop: -7,
              width: 14, height: 14,
              border: '2px solid #f59e0b',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'addr-spin 0.65s linear infinite',
              display: 'inline-block',
            }}
          />
        )}
      </div>

      {busy && (
        <p className="text-[11px] text-amber-500 font-medium mt-1 ml-1">Searching…</p>
      )}
      {!busy && showHint && (
        <p className="text-[11px] text-slate-400 mt-1 ml-1">
          Type {charsLeft} more character{charsLeft !== 1 ? 's' : ''} to search…
        </p>
      )}

      {/* Render dropdown via portal — escapes any transform/overflow context */}
      {createPortal(dropdown, document.body)}

      <style>{`@keyframes addr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

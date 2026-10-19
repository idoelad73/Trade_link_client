/**
 * TermsOfUseModal — the full Terms of Use, rendered from terms_of_use.json.
 *
 * The JSON is imported rather than fetched so the terms are always available
 * at the moment of acceptance: a user must never be able to tick the box while
 * a network hiccup leaves the text blank. The signed PDF is linked for download
 * and is the authoritative copy.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import terms from '../../constants/terms_of_use.json';
import useUIStore from '../../stores/uiStore.js';

const content = {
  en: {
    badge:      '📄 Terms of Use',
    effective:  (d) => `Effective ${d}`,
    operator:   'Operator',
    download:   '⬇ Download PDF',
    close:      'Close',
    accept:     'I agree',
    scrollHint: 'Scroll to the end to continue',
  },
  es: {
    badge:      '📄 Términos de Uso',
    effective:  (d) => `Vigente desde ${d}`,
    operator:   'Operador',
    download:   '⬇ Descargar PDF',
    close:      'Cerrar',
    accept:     'Acepto',
    scrollHint: 'Desplázate hasta el final para continuar',
  },
};

export default function TermsOfUseModal({ onClose, onAccept }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang] ?? content.en;

  const bodyRef = useRef(null);
  // Only gate the "I agree" button when this modal is being used to accept.
  const [reachedEnd, setReachedEnd] = useState(!onAccept);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // A body short enough not to scroll would otherwise never mark itself read.
  useEffect(() => {
    const el = bodyRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 4) setReachedEnd(true);
  }, []);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 24) setReachedEnd(true);
  };

  // Portalled to <body> on purpose. Both registration forms carry
  // `backdrop-blur-sm`, and backdrop-filter makes an element a containing block
  // for its position:fixed descendants — so rendered in place, this overlay
  // anchors to the <form> instead of the viewport. On the long trade form that
  // put the card far above the user's scroll position while the backdrop still
  // covered everything, which looked like "the terms won't open".
  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={terms.title}
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">

        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-sky-400" />

        {/* Header */}
        <div className="px-5 sm:px-7 pt-4 pb-3 border-b border-slate-100 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {t.badge}
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-800 mt-1.5">{terms.title}</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t.effective(terms.effectiveDate)} · {t.operator}: {terms.operator}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t.close}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-base leading-none transition"
          >×</button>
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 sm:px-7 py-4 bg-slate-50"
        >
          {terms.sections.map((section) => (
            <section key={section.number} className="mb-5 last:mb-0">
              <h3 className="text-sm font-extrabold text-slate-800 mb-2">
                {section.number}. {section.title}
              </h3>
              <div className="space-y-2.5">
                {section.clauses.map((c) => (
                  <div key={c.id} className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5">
                    <p className="text-[13px] text-slate-600 leading-relaxed">
                      <span className="font-bold text-slate-800">{c.id} {c.heading}.</span>{' '}
                      {c.text}
                    </p>
                    {c.list && (
                      <ul className="list-disc pl-5 mt-1.5 space-y-1">
                        {c.list.map((item, i) => (
                          <li key={i} className="text-[12.5px] text-slate-500 leading-relaxed">{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-7 py-3 border-t border-slate-100 flex items-center gap-2 flex-shrink-0 flex-wrap">
          <a
            href={terms.pdf}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
          >
            {t.download}
          </a>
          <div className="flex-1" />
          {onAccept ? (
            <>
              {!reachedEnd && (
                <span className="text-[11px] text-slate-400">{t.scrollHint}</span>
              )}
              <button
                onClick={() => { onAccept(); onClose(); }}
                disabled={!reachedEnd}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs transition active:scale-95"
              >
                ✓ {t.accept}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold text-xs transition"
            >
              {t.close}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

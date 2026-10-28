/**
 * RateCommentModal — the contractor's free-text explanation of how a trade's
 * rate/budget was set.
 *
 * One component serves both sides of the feature:
 *   • readOnly=false → contractor writes/edits it (budget step, manage trades)
 *   • readOnly=true  → trade pro reads it from a job card
 * Keeping them together means the copy and layout can't drift apart.
 */
import { useState, useEffect } from 'react';
import useUIStore from '../../stores/uiStore.js';

const MAX_LEN = 1000;

const content = {
  en: {
    badge:       '💬 Rate Comments',
    titleEdit:   'Explain this rate',
    titleView:   'About this rate',
    forTrade:    (name) => `For ${name}`,
    placeholder: 'Explain how you set this budget — e.g. scope included, materials, access constraints, why the total is what it is…',
    empty:       'The contractor has not added an explanation for this rate.',
    save:        'Save Comment',
    saving:      'Saving…',
    delete:      'Delete',
    confirmDel:  'Delete this comment?',
    cancel:      'Cancel',
    close:       'Close',
    remaining:   (n) => `${n} characters left`,
  },
  es: {
    badge:       '💬 Comentarios de Tarifa',
    titleEdit:   'Explica esta tarifa',
    titleView:   'Sobre esta tarifa',
    forTrade:    (name) => `Para ${name}`,
    placeholder: 'Explica cómo definiste este presupuesto — alcance incluido, materiales, restricciones de acceso, por qué el total es ese…',
    empty:       'El contratista no agregó una explicación para esta tarifa.',
    save:        'Guardar Comentario',
    saving:      'Guardando…',
    delete:      'Eliminar',
    confirmDel:  '¿Eliminar este comentario?',
    cancel:      'Cancelar',
    close:       'Cerrar',
    remaining:   (n) => `${n} caracteres restantes`,
  },
};

export default function RateCommentModal({
  tradeName,
  value = '',
  readOnly = false,
  onSave,     // (text) => void | Promise — only called when readOnly is false; a rejected promise keeps the modal open
  onDelete,   // optional () => Promise — shows a Delete button when there is a saved comment
  onClose,
}) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang] ?? content.en;

  const [text, setText] = useState(value ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
      onClose();
    } catch {
      // caller shows the error; keep the modal open so the text isn't lost
    } finally {
      setBusy(false);
    }
  };

  const handleSave   = () => run(() => onSave?.(text.trim().slice(0, MAX_LEN)));
  const handleDelete = () => { if (window.confirm(t.confirmDel)) run(() => onDelete()); };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-sky-400" />

        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {t.badge}
            </span>
            <h3 className="text-sm font-extrabold text-slate-800 mt-1.5">
              {readOnly ? t.titleView : t.titleEdit}
            </h3>
            {tradeName && <p className="text-[11px] text-slate-400 mt-0.5">{t.forTrade(tradeName)}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-base leading-none transition"
          >×</button>
        </div>

        <div className="px-5 py-4">
          {readOnly ? (
            value?.trim() ? (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                {value}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic text-center py-4">{t.empty}</p>
            )
          ) : (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
                placeholder={t.placeholder}
                rows={6}
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 transition resize-none"
              />
              <p className="text-[10px] text-slate-400 text-right mt-1">
                {t.remaining(MAX_LEN - text.length)}
              </p>
            </>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          {readOnly ? (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold text-sm transition"
            >
              {t.close}
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={busy}
                className="flex-1 disabled:opacity-60 bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 text-white font-semibold py-2.5 rounded-xl text-sm shadow shadow-amber-200 transition-all active:scale-[0.98]"
              >
                {busy ? t.saving : t.save}
              </button>
              {onDelete && value?.trim() && (
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 font-semibold text-sm transition disabled:opacity-60"
                >
                  {t.delete}
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
              >
                {t.cancel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

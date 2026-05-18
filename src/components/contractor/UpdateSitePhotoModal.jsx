import { useState, useRef, useEffect } from 'react';
import { updateSite } from '../../api/contractor.js';
import useUIStore from '../../stores/uiStore.js';

const content = {
  en: {
    badge:    '📷 Update Photo',
    title:    (name) => `Photo for "${name}"`,
    current:  'Current Photo',
    noCurrent:'No photo yet',
    new:      'New Photo',
    hint:     'Click or drag to upload',
    hint2:    'JPG, PNG, WEBP — max 5 MB',
    remove:   'Remove',
    btn:      { save: 'Save Photo', saving: 'Uploading…', cancel: 'Cancel' },
    error:    'Upload failed. Please try again.',
  },
  es: {
    badge:    '📷 Actualizar Foto',
    title:    (name) => `Foto de "${name}"`,
    current:  'Foto Actual',
    noCurrent:'Sin foto aún',
    new:      'Nueva Foto',
    hint:     'Haz clic o arrastra para subir',
    hint2:    'JPG, PNG, WEBP — máx 5 MB',
    remove:   'Quitar',
    btn:      { save: 'Guardar Foto', saving: 'Subiendo…', cancel: 'Cancelar' },
    error:    'Error al subir. Inténtalo de nuevo.',
  },
};

export default function UpdateSitePhotoModal({ site, onClose, onUpdated }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const inputRef                    = useRef();
  const [file,    setFile]          = useState(null);
  const [preview, setPreview]       = useState(null);
  const [saving,  setSaving]        = useState(false);
  const [error,   setError]         = useState('');
  const [dragging, setDragging]     = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // Revoke object URL when component unmounts to avoid memory leak
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pickFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  };

  const handleInputChange = (e) => pickFile(e.target.files?.[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleSave = async () => {
    if (!file) return;
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const updated = await updateSite(site._id, fd);
      onUpdated(updated);
      onClose();
    } catch {
      setError(t.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* Accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 to-amber-400 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200 mb-2">
              {t.badge}
            </div>
            <h2 className="text-lg font-extrabold text-slate-800 leading-tight">{t.title(site.name)}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg"
          >×</button>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5">

          {/* Current photo */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">{t.current}</p>
            {site.photo ? (
              <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <img src={site.photo} alt={site.name} className="w-full h-40 object-cover" />
              </div>
            ) : (
              <div className="w-full h-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm">
                {t.noCurrent}
              </div>
            )}
          </div>

          {/* Upload zone */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">{t.new}</p>

            {preview ? (
              <div className="relative rounded-2xl overflow-hidden border border-sky-100 shadow-sm">
                <img src={preview} alt="preview" className="w-full h-48 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreview(null); inputRef.current.value = ''; }}
                  className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition"
                >
                  × {t.remove}
                </button>
                <p className="absolute bottom-3 left-3 text-white text-xs font-medium opacity-80 truncate max-w-[80%]">{file.name}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center justify-center gap-2 transition-all ${
                  dragging
                    ? 'border-sky-400 bg-sky-50'
                    : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/50'
                }`}
              >
                <span className="text-3xl">{dragging ? '⬇️' : '📷'}</span>
                <span className="text-sm font-semibold text-slate-600">{t.hint}</span>
                <span className="text-xs text-slate-400">{t.hint2}</span>
              </button>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 flex gap-3">
          <button
            onClick={handleSave}
            disabled={!file || saving}
            className="flex-1 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 disabled:opacity-50 text-white font-semibold py-3 rounded-2xl shadow shadow-sky-200 transition-all active:scale-[0.99] text-sm"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {t.btn.saving}
              </span>
            ) : t.btn.save}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
          >
            {t.btn.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * TermsCheckbox — the sign-up acceptance control, shared by both registration
 * forms so the wording and the accepted version can never drift between them.
 *
 * The label text is a button that opens the full Terms, so a user can read
 * them without losing anything already typed into the form.
 */
import { useState } from 'react';
import terms from '../../constants/terms_of_use.json';
import useUIStore from '../../stores/uiStore.js';
import TermsOfUseModal from './TermsOfUseModal.jsx';

const content = {
  en: {
    before: 'I have read and agree to the',
    link:   'Terms of Use',
    after:  '',
    error:  'You must accept the Terms of Use to create an account.',
  },
  es: {
    before: 'He leído y acepto los',
    link:   'Términos de Uso',
    after:  '',
    error:  'Debes aceptar los Términos de Uso para crear una cuenta.',
  },
};

export default function TermsCheckbox({ checked, onChange, accent = 'amber' }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang] ?? content.en;
  const [open, setOpen] = useState(false);

  const ring = accent === 'sky' ? 'focus:ring-sky-300 text-sky-600' : 'focus:ring-amber-300 text-amber-600';
  const link = accent === 'sky' ? 'text-sky-600 hover:text-sky-700' : 'text-amber-600 hover:text-amber-700';

  return (
    <>
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={`mt-0.5 w-4 h-4 rounded border-slate-300 ${ring} focus:ring-2 cursor-pointer flex-shrink-0`}
        />
        <span className="text-sm text-slate-600 leading-snug">
          {t.before}{' '}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setOpen(true); }}
            className={`font-bold underline ${link} transition`}
          >
            {t.link}
          </button>
          {t.after}
        </span>
      </label>

      {open && (
        <TermsOfUseModal
          onClose={() => setOpen(false)}
          onAccept={() => onChange(true)}
        />
      )}
    </>
  );
}

// Exported so the forms can report the same message without duplicating copy.
export const termsError = (lang) => (content[lang] ?? content.en).error;
export const TERMS_VERSION = terms.version;

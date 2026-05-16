import { useState, useRef, useEffect } from 'react';
import useUIStore from '../stores/uiStore';
import LoginModal from './LoginModal';

const loginMenu = {
  en: {
    button: 'Login',
    trade:      '🔧 Trade Professional',
    contractor: '🏗️ Building Contractor',
  },
  es: {
    button: 'Ingresar',
    trade:      '🔧 Profesional',
    contractor: '🏗️ Contratista',
  },
};

export default function Navbar() {
  const { lang, setLang, openModal, activeModal } = useUIStore();
  const [showLoginMenu, setShowLoginMenu] = useState(false);
  const menuRef = useRef();
  const m = loginMenu[lang];

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowLoginMenu(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <>
      <nav className="flex items-center justify-between px-8 py-5 bg-white/70 backdrop-blur-md border-b border-yellow-100 sticky top-0 z-50 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center shadow">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="text-xl font-bold text-sky-600 tracking-tight">TradeLink</span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">

          {/* Login dropdown */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setShowLoginMenu((v) => !v)}
              className="flex items-center gap-1.5 bg-white border border-sky-200 hover:border-sky-400 text-sky-700 text-sm font-semibold rounded-xl px-4 py-2 shadow-sm hover:shadow-md transition-all duration-150"
            >
              {m.button}
              <svg
                className={`w-3.5 h-3.5 text-sky-400 transition-transform duration-200 ${showLoginMenu ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showLoginMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 p-1.5 z-50">
                <button
                  onClick={() => { openModal('loginTrade'); setShowLoginMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors text-left"
                >
                  <span className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center text-base flex-shrink-0">🔧</span>
                  {m.trade}
                </button>
                <button
                  onClick={() => { openModal('loginContractor'); setShowLoginMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors text-left"
                >
                  <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-base flex-shrink-0">🏗️</span>
                  {m.contractor}
                </button>
              </div>
            )}
          </div>

          {/* Language selector */}
          <div className="relative">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="appearance-none bg-yellow-50 border border-yellow-200 text-amber-700 text-sm font-medium rounded-xl px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-yellow-300 cursor-pointer hover:bg-yellow-100 transition-colors"
            >
              <option value="en">🇺🇸 English</option>
              <option value="es">🇪🇸 Español</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

        </div>
      </nav>

      {/* Login modal — rendered when activeModal is loginTrade or loginContractor */}
      {(activeModal === 'loginTrade' || activeModal === 'loginContractor') && <LoginModal />}
    </>
  );
}

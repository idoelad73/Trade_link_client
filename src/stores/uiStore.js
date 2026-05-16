import { create } from 'zustand';

// Domain: UI state (modals, toasts, sidebar, language)
const useUIStore = create((set) => ({
  lang: 'en',          // 'en' | 'es'
  sidebarOpen: false,
  activeModal: null,   // string | null

  // actions — functional code added later
  setLang: (lang) => set({ lang }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
}));

export default useUIStore;

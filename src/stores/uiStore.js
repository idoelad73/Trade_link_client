import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUIStore = create(
  persist(
    (set) => ({
      lang: 'en',
      sidebarOpen: false,
      activeModal: null,

      setLang:       (lang) => set({ lang }),
      toggleSidebar: ()     => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      openModal:     (name) => set({ activeModal: name }),
      closeModal:    ()     => set({ activeModal: null }),
    }),
    {
      name: 'tl-ui',
      partialize: (state) => ({ lang: state.lang }), // only persist language choice
    }
  )
);

export default useUIStore;

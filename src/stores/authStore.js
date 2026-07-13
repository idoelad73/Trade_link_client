import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Domain: authentication & current user
const useAuthStore = create(
  persist(
    (set) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,

      setAuth: ({ user, token }) => set({ user, token, isAuthenticated: true }),
      setUser: (user)            => set({ user, isAuthenticated: !!user }),
      clearAuth: ()              => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'tl-auth' }
  )
);

export default useAuthStore;

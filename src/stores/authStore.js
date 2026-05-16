import { create } from 'zustand';

// Domain: authentication & current user
const useAuthStore = create((set) => ({
  user:            null,
  token:           null,
  isAuthenticated: false,

  setAuth: ({ user, token }) => set({ user, token, isAuthenticated: true }),
  setUser: (user)            => set({ user, isAuthenticated: !!user }),
  clearAuth: ()              => set({ user: null, token: null, isAuthenticated: false }),
}));

export default useAuthStore;

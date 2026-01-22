import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserTier } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  upgradeTier: (tier: UserTier) => void;
  initializeFromStorage: () => void;
  updateUserFromBackend: (backendData: any) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isAdmin: false,
      token: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            set({ isLoading: false });
            return false;
          }

          const data = await response.json();
          const { accessToken, refreshToken } = data;

          // Store tokens
          localStorage.setItem('token', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          // Decode token to get user info (simple base64 decode)
          try {
            const tokenParts = accessToken.split('.');
            if (tokenParts.length === 3) {
              const decodedPayload = JSON.parse(
                atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
              );
              
              const isAdmin = decodedPayload.roles?.includes('admin') || false;
              
              const user: User = {
                id: decodedPayload.sub,
                email,
                name: email.split('@')[0],
                tier: 'free',
                role: isAdmin ? 'admin' : 'user',
                skills: [],
                preferredLocations: [],
                preferredRoles: [],
                createdAt: new Date().toISOString(),
                notificationPreferences: {
                  email: true,
                  whatsapp: false,
                  telegram: false,
                  newJobMatch: true,
                  deadlineReminder: true,
                  applicationUpdate: true,
                  referralUpdate: false,
                },
              };
              

              set({
                user,
                isAuthenticated: true,
                isLoading: false,
                isAdmin,
                token: accessToken,
              });
              return true;
            } else {
            }
          } catch (decodeErr) {
          }

          set({ isLoading: false });
          return false;
        } catch (err) {
          set({ isLoading: false });
          return false;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        
        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name }),
          });

          if (!response.ok) {
            set({ isLoading: false });
            return false;
          }

          const data = await response.json();
          const { accessToken, refreshToken } = data;

          // Store tokens
          localStorage.setItem('token', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          const user: User = {
            id: Date.now().toString(),
            email,
            name,
            tier: 'free',
            role: 'user',
            skills: [],
            preferredLocations: [],
            preferredRoles: [],
            createdAt: new Date().toISOString(),
            notificationPreferences: {
              email: true,
              whatsapp: false,
              telegram: false,
              newJobMatch: true,
              deadlineReminder: true,
              applicationUpdate: true,
              referralUpdate: false,
            },
          };
          
          set({ user, isAuthenticated: true, isLoading: false, isAdmin: false, token: accessToken });
          return true;
        } catch (err) {
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        set({ user: null, isAuthenticated: false, isAdmin: false, token: null });
      },

      updateUser: (updates: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },

      updateUserFromBackend: (backendData: any) => {
        set((state) => {
          if (!state.user) return state;
          
          const updatedUser = {
            ...state.user,
            ...backendData,
            // Preserve auth-specific fields
            id: state.user.id,
            role: state.user.role,
            createdAt: state.user.createdAt,
            notificationPreferences: backendData.notificationPreferences || state.user.notificationPreferences,
          };
          
          return { user: updatedUser };
        });
      },

      upgradeTier: (tier: UserTier) => {
        set((state) => ({
          user: state.user ? { ...state.user, tier } : null,
        }));
      },

      initializeFromStorage: () => {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const decodedPayload = JSON.parse(
                atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
              );
              
              const user: User = {
                id: decodedPayload.sub,
                email: decodedPayload.email || 'user@app.com',
                name: decodedPayload.name || 'User',
                tier: 'free',
                role: decodedPayload.roles?.includes('admin') ? 'admin' : 'user',
                skills: [],
                preferredLocations: [],
                preferredRoles: [],
                createdAt: new Date().toISOString(),
                notificationPreferences: {
                  email: true,
                  whatsapp: false,
                  telegram: false,
                  newJobMatch: true,
                  deadlineReminder: true,
                  applicationUpdate: true,
                  referralUpdate: false,
                },
              };

              set({
                user,
                isAuthenticated: true,
                isAdmin: decodedPayload.roles?.includes('admin') || false,
                token,
              });
            }
          } catch (err) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
          }
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

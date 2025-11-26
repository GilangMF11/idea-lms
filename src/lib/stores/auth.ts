import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    
    // Initialize auth state from localStorage
    init: () => {
      if (browser) {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');
        
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            update(state => ({
              ...state,
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            }));
          } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            update(state => ({ ...state, isLoading: false }));
          }
        } else {
          update(state => ({ ...state, isLoading: false }));
        }
      }
    },

    // Login user
    login: async (email: string, password: string) => {
      update(state => ({ ...state, isLoading: true }));
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }

        const { user, token } = data;

        // Store in localStorage
        if (browser) {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_user', JSON.stringify(user));
        }

        update(state => ({
          ...state,
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        }));

        return { success: true, user };
      } catch (error) {
        update(state => ({ ...state, isLoading: false }));
        return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
      }
    },

    // Register user
    register: async (userData: {
      email: string;
      username: string;
      password: string;
      firstName: string;
      lastName: string;
      role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
      phoneNumber?: string;
      institution?: string;
      program?: string;
      semester?: number;
      province?: string;
      city?: string;
    }) => {
      update(state => ({ ...state, isLoading: true }));
      
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        const { user, token } = data;

        // Store in localStorage
        if (browser) {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_user', JSON.stringify(user));
        }

        update(state => ({
          ...state,
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        }));

        return { success: true, user };
      } catch (error) {
        update(state => ({ ...state, isLoading: false }));
        return { success: false, error: error instanceof Error ? error.message : 'Registration failed' };
      }
    },

    // Logout user
    logout: () => {
      if (browser) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
      
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    },

    // Get auth headers for API calls
    getAuthHeaders: () => {
      let token: string | null = null;
      subscribe(state => { token = state.token })();
      
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
  };
}

export const authStore = createAuthStore();

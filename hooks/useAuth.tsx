// hooks/useAuth.ts
"use client"

import { useState, useEffect, useContext, createContext } from 'react';
import { useRouter } from 'next/navigation';

interface UserSession {
  UserId: number;
  // Add other properties if your GetCurrentSession returns more
}

interface AuthContextType {
  user: UserSession | null | undefined; // undefined for loading, null for not logged in
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUser(data.user);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to fetch session:', err);
        setError('Failed to connect to authentication service.');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [router]);

  const authContextValue = { user, isLoading, error };

  return (
    <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

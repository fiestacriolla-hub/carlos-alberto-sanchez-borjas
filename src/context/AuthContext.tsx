import React, { createContext, useContext, useState, useEffect } from "react";
import { mockDb, User } from "../services/mockDb";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize mock DB
    mockDb.init();

    // Check localStorage for session
    try {
      const storedUser = localStorage.getItem("session_user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error parsing session user:", error);
      localStorage.removeItem("session_user");
    }
    setLoading(false);
  }, []);

  const login = (userData: User) => {
    // Remove password before saving to session
    const { password, ...safeUser } = userData;
    localStorage.setItem("session_user", JSON.stringify(safeUser));
    setUser(safeUser as User);
  };

  const logout = () => {
    localStorage.removeItem("session_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

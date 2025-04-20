// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  register: (email: string, password: string, firstName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  logout: async () => {},
  register: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const register = async (email: string, password: string, firstName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Optionally, update the user's profile with the first name
    // await updateProfile(userCredential.user, { displayName: firstName });
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

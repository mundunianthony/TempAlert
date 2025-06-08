import React, { createContext, useContext, useEffect, useState } from "react";
import { authInstance } from "../lib/firebase"; // your initialized firebase auth
import {
  User,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  reload,
} from "firebase/auth";

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  lastName: string | null;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  logout: async () => {},
  register: async () => {},
  lastName: null,
  refreshUser: async () => {},
  isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastName, setLastName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authInstance, async (u) => {
      setUser(u);
      setLastName(u?.displayName?.split(" ").slice(-1).join(" ") || null);
      
      if (u) {
        // Check admin status from custom claims
        const idTokenResult = await u.getIdTokenResult();
        setIsAdmin(idTokenResult.claims.admin === true);
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(authInstance);
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    const userCredential = await createUserWithEmailAndPassword(
      authInstance,
      email,
      password
    );
    await updateProfile(userCredential.user, {
      displayName: `${firstName} ${lastName}`,
    });
  };

  const refreshUser = async () => {
    if (authInstance.currentUser) {
      await reload(authInstance.currentUser);
      setUser(authInstance.currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, logout, register, lastName, refreshUser, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
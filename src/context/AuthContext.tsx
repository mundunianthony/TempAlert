import React, { createContext, useContext, useEffect, useState } from "react";
import { authInstance } from "@/src/lib/firebase"; // your initialized firebase auth
import {
  User,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
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
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  logout: async () => {},
  register: async () => {},
  lastName: null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastName, setLastName] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authInstance, (u) => {
      setUser(u);
      setLastName(u?.displayName?.split(" ").slice(-1).join(" ") || null);
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

  return (
    <AuthContext.Provider value={{ user, loading, logout, register, lastName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

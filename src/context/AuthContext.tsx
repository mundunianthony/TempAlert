import React, { createContext, useContext, useEffect, useState } from "react";
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthContextProps {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  logout: async () => {},
  register: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(u => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await auth().signOut();
  };

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({
      displayName: `${firstName} ${lastName}`,
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

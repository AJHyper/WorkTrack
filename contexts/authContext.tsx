// contexts/authcontext.tsx

import { createUserWithEmailAndPassword, User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebase"; // adjust path if needed

interface AuthContextType {
  user: FirebaseUser | null;
  setUser: React.Dispatch<React.SetStateAction<FirebaseUser | null>>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  updateUserData: (updatedFields: Partial<any>) => Promise<void>; // Replace 'any' with your user data type
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);

  const loadUserData = async (uid: string) => {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, { createdAt: new Date() });
    }
  };

  const login = async (email: string, password: string) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    setUser(res.user);
    await loadUserData(res.user.uid);
  };

  const register = async (email: string, password: string) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    setUser(res.user);
    await loadUserData(res.user.uid);
  };

  const updateUserData = async (updatedFields: Partial<any>) => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, updatedFields);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await loadUserData(firebaseUser.uid);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

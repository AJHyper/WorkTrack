import {
  createUserWithEmailAndPassword,
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  UserCredential,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { auth, db } from "../config/firebase";

interface AuthContextType {
  user: FirebaseUser | null;
  login: (email: string, password: string) => Promise<UserCredential>;
  register: (email: string, password: string) => Promise<UserCredential>;
  updateUserData: (updatedFields: Partial<Record<string, any>>) => Promise<void>;
  updateProfileName: (displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);

  const loadUserData = async (uid: string) => {
    try {
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, { createdAt: new Date() });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const login = async (email: string, password: string): Promise<UserCredential> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      await loadUserData(userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const register = async (email: string, password: string): Promise<UserCredential> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      await loadUserData(userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const updateUserData = async (updatedFields: Partial<Record<string, any>>) => {
    if (!user) throw new Error("No authenticated user");
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, updatedFields);
    } catch (error) {
      console.error("Error updating user data:", error);
      throw error;
    }
  };

  const updateProfileName = async (displayName: string) => {
    if (!user) throw new Error("No authenticated user");
    try {
      await updateProfile(user, { displayName });
      // Refresh user state for updated profile data
      setUser(auth.currentUser);
    } catch (error) {
      console.error("Error updating profile name:", error);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
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
    <AuthContext.Provider
      value={{ user, login, register, updateUserData, updateProfileName, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

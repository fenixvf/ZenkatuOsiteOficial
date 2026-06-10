import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase";
import { useUpsertUsuario, useGetUsuario } from "@workspace/api-client-react";
import { Usuario } from "@workspace/api-zod";

interface AuthContextType {
  currentUser: User | null;
  userProfile: Usuario | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function upsertUser(upsert: (data: any) => Promise<any>, user: User) {
  try {
    await upsert({
      data: {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName,
        photoUrl: user.photoURL,
      },
    });
  } catch (e) {
    console.error("Error upserting user", e);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const upsertUsuario = useUpsertUsuario();

  const { data: userProfileData } = useGetUsuario(currentUser?.uid || "", {
    query: {
      enabled: !!currentUser?.uid,
      queryKey: ["getUsuario", currentUser?.uid] as any,
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await upsertUser((data) => upsertUsuario.mutateAsync(data), user);
      }
      setLoading(false);
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const userProfile = userProfileData as Usuario | null;
  const isAdmin =
    userProfile?.role === "admin" ||
    currentUser?.email === "souzawalisonlopes52@gmail.com";

  return (
    <AuthContext.Provider
      value={{ currentUser, userProfile, signInWithEmail, signOut, isAdmin, loading }}
    >
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

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { useUpsertUsuario, useGetUsuario } from "@workspace/api-client-react";
import { Usuario } from "@workspace/api-zod";

interface AuthContextType {
  currentUser: User | null;
  userProfile: Usuario | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const upsertUsuario = useUpsertUsuario();
  
  const { data: userProfileData } = useGetUsuario(currentUser?.uid || "", {
    query: {
      enabled: !!currentUser?.uid,
      queryKey: ["getUsuario", currentUser?.uid] as any,
    }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          await upsertUsuario.mutateAsync({
            data: {
              uid: user.uid,
              email: user.email || "",
              displayName: user.displayName,
              photoUrl: user.photoURL,
            }
          });
        } catch (e) {
          console.error("Error upserting user", e);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [upsertUsuario]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const userProfile = userProfileData as Usuario | null;
  const isAdmin = userProfile?.role === "admin" || currentUser?.email === "souzawalisonlopes52@gmail.com";

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        signInWithGoogle,
        signOut,
        isAdmin,
        loading,
      }}
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

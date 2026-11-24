import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase";
import { useUpsertUsuario, useGetUsuario, type Usuario } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  currentUser: User | null;
  userProfile: Usuario | null;
  userProfileLoading: boolean;
  userProfileError: boolean;
  profileSyncing: boolean;
  retryUserProfileSync: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isZenkatuber: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function upsertUser(upsert: (data: any) => Promise<any>, user: User) {
  await upsert({
    data: {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName,
      photoUrl: user.photoURL,
    },
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileSyncing, setProfileSyncing] = useState(false);
  const [profileSyncFailed, setProfileSyncFailed] = useState(false);

  const queryClient = useQueryClient();
  const upsertUsuario = useUpsertUsuario();

  const {
    data: userProfileData,
    isLoading: userProfileLoading,
    isError: userProfileQueryFailed,
    refetch: refetchUserProfile,
  } = useGetUsuario(currentUser?.uid || "", {
    query: {
      enabled: !!currentUser?.uid,
      queryKey: ["getUsuario", currentUser?.uid] as any,
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          await upsertUser((data) => upsertUsuario.mutateAsync(data), user);
          setProfileSyncFailed(false);
        } catch (e) {
          console.error("Error upserting user profile", e);
          setProfileSyncFailed(true);
        } finally {
          await queryClient.invalidateQueries({ queryKey: ["getUsuario", user.uid] });
        }
      } else {
        setProfileSyncFailed(false);
      }
      setLoading(false);
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryUserProfileSync = async () => {
    if (!currentUser) return;
    setProfileSyncing(true);
    setProfileSyncFailed(false);
    try {
      await upsertUser((data) => upsertUsuario.mutateAsync(data), currentUser);
      const result = await refetchUserProfile();
      if (result.error || !result.data) {
        throw result.error ?? new Error("Profile sync returned no user profile");
      }
    } catch (e) {
      console.error("Error retrying user profile sync", e);
      setProfileSyncFailed(true);
    } finally {
      setProfileSyncing(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const userProfile = userProfileData as Usuario | null;
  const userProfileError = profileSyncFailed || userProfileQueryFailed;
  const isAdmin =
    userProfile?.role === "admin" ||
    currentUser?.email === "souzawalisonlopes52@gmail.com";
  const isZenkatuber = (userProfile as any)?.isZenkatuber === true || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        userProfileLoading,
        userProfileError,
        profileSyncing,
        retryUserProfileSync,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        isAdmin,
        isZenkatuber,
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

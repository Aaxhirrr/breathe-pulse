import type { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { firebaseAuth } from "./firebase";

/**
 * Hook to subscribe to the current user.
 * Returns the current user if logged in, otherwise null.
 *
 * If within a UserGuard it is recommended to use useUserGuardContext instead.
 */
export const useCurrentUser = (): {
  user: User | null;
  loading: boolean;
} => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((user: User | null) => {
      setUser(user);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { user, loading };
};

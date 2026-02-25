"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const { user, isLoading, isAdmin, fetchMe } = useAuthStore();

  useEffect(() => {
    if (!user && isLoading) {
      fetchMe();
    }
  }, [user, isLoading, fetchMe]);

  return { user, isLoading, isAdmin };
}

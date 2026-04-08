"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageSkeleton } from "./loading-skeleton";

/** Allows only admin role */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/leads");
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading) return <PageSkeleton />;
  if (!isAdmin) return null;
  return <>{children}</>;
}

/** Allows admin and manager roles */
export function ManagerGuard({ children }: { children: React.ReactNode }) {
  const { isManager, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isManager) {
      router.replace("/leads");
    }
  }, [isManager, isLoading, router]);

  if (isLoading) return <PageSkeleton />;
  if (!isManager) return null;
  return <>{children}</>;
}

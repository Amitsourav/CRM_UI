"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageSkeleton } from "./loading-skeleton";

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

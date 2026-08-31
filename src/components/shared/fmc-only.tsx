"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PageSkeleton } from "./loading-skeleton";

/**
 * FundMyCampus-only pages. Admitverse has no lenders — its backend answers
 * these endpoints with a 400 — so the whole section is gated rather than
 * left to fail per request.
 *
 * Matches the codebase's FMC convention (`slug !== "admitverse"`) rather than
 * testing for a specific FMC slug.
 */
export function FmcOnly({ children }: { children: React.ReactNode }) {
  const isLoading = useAuthStore((s) => s.isLoading);
  const slug = useAuthStore((s) => s.company?.company_slug ?? null);
  const router = useRouter();
  const isAdmitverse = slug === "admitverse";

  useEffect(() => {
    if (!isLoading && isAdmitverse) router.replace("/leads");
  }, [isLoading, isAdmitverse, router]);

  if (isLoading) return <PageSkeleton />;
  if (isAdmitverse) return null;
  return <>{children}</>;
}

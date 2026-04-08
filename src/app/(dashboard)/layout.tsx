"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import ActiveCallsBar from "@/components/calls/active-calls-bar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, fetchMe, isManager } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // If user already set (e.g. just logged in), just mark loading done.
    // Only call fetchMe on page refresh when we have a token but no user yet.
    if (!user && localStorage.getItem("access_token")) {
      fetchMe();
    } else if (user && isLoading) {
      // User exists from login, just clear loading
      useAuthStore.setState({ isLoading: false });
    } else if (!user) {
      // No user and no token — redirect will happen via the effect below
      useAuthStore.setState({ isLoading: false });
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageSkeleton />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-64">
        <Topbar />
        <main className="p-4 md:p-6">{children}</main>
      </div>
      {isManager && <ActiveCallsBar />}
    </div>
  );
}

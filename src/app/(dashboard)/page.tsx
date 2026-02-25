"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

export default function DashboardHome() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "admin") {
        router.replace("/admin/reports");
      } else {
        router.replace("/leads");
      }
    }
  }, [user, isLoading, router]);

  return null;
}

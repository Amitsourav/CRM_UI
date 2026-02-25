"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { UserForm } from "@/components/users/user-form";
import { UserStatsCard } from "@/components/users/user-stats-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageSkeleton } from "@/components/shared/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, UserX } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { format } from "date-fns";
import type { User, UserStats } from "@/types";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [userRes, statsRes] = await Promise.all([
        api.get<User>(`/users/${userId}`),
        api.get<UserStats>(`/users/${userId}/stats`).catch(() => ({ data: null })),
      ]);
      setUser(userRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error("Failed to load user");
      router.push("/admin/users");
    } finally {
      setIsLoading(false);
    }
  }, [userId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeactivate = async () => {
    try {
      await api.delete(`/users/${userId}`);
      toast.success("User deactivated");
      router.push("/admin/users");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to deactivate user");
    }
  };

  if (isLoading || !user) return <PageSkeleton />;

  return (
    <AdminGuard>
      <div className="space-y-6">
        <PageHeader title={user.full_name}>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {user.is_active && (
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeactivateOpen(true)}>
              <UserX className="mr-2 h-4 w-4" />
              Deactivate
            </Button>
          )}
        </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{user.phone || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge className="capitalize">{user.role}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vertical</p>
                <p className="font-medium">{user.vertical || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={user.is_active ? "default" : "destructive"}>
                  {user.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="font-medium">{format(new Date(user.created_at), "MMM d, yyyy")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {stats && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Performance Stats</h2>
            <UserStatsCard stats={stats} />
          </div>
        )}

        <UserForm open={editOpen} onOpenChange={setEditOpen} user={user} onSuccess={fetchData} />

        <ConfirmDialog
          open={deactivateOpen}
          onOpenChange={setDeactivateOpen}
          title="Deactivate User"
          description="Are you sure you want to deactivate this user?"
          confirmLabel="Deactivate"
          onConfirm={handleDeactivate}
          destructive
        />
      </div>
    </AdminGuard>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { UserTable } from "@/components/users/user-table";
import { UserForm } from "@/components/users/user-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { User } from "@/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState("");

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", "20");
      if (roleFilter !== "all") params.set("role", roleFilter);
      const { data } = await api.get(`/users?${params.toString()}`);
      const items: User[] = Array.isArray(data) ? data : (data.items || []);
      const pages: number = Array.isArray(data) ? 1 : (data.total_pages || 1);
      setUsers(items);
      setTotalPages(pages);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [page, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeactivate = async () => {
    try {
      await api.delete(`/users/${deactivatingId}`);
      toast.success("User deactivated");
      fetchUsers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to deactivate user");
    }
    setDeactivateOpen(false);
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        <PageHeader title="User Management" description="Manage system users and agents">
          <Button onClick={() => { setEditingUser(undefined); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Register User
          </Button>
        </PageHeader>

        <div className="flex gap-3">
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="pre_counsellor">Pre Counsellor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <UserTable
          users={users}
          isLoading={isLoading}
          onEdit={(user) => { setEditingUser(user); setFormOpen(true); }}
          onDeactivate={(id) => { setDeactivatingId(id); setDeactivateOpen(true); }}
        />

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

        <UserForm open={formOpen} onOpenChange={setFormOpen} user={editingUser} onSuccess={fetchUsers} />

        <ConfirmDialog
          open={deactivateOpen}
          onOpenChange={setDeactivateOpen}
          title="Deactivate User"
          description="Are you sure you want to deactivate this user? They will no longer be able to log in."
          confirmLabel="Deactivate"
          onConfirm={handleDeactivate}
          destructive
        />
      </div>
    </AdminGuard>
  );
}

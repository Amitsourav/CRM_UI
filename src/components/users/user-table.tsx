"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, BarChart3, Edit, UserX } from "lucide-react";
import { format } from "date-fns";
import type { User } from "@/types";

interface UserTableProps {
  users: User[];
  isLoading: boolean;
  onEdit: (user: User) => void;
  onDeactivate: (userId: string) => void;
}

export function UserTable({ users, isLoading, onEdit, onDeactivate }: UserTableProps) {
  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Name",
      cell: (user) => <span className="font-medium">{user.full_name}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (user) => user.email,
    },
    {
      key: "role",
      header: "Role",
      cell: (user) => (
        <Badge variant={user.role === "admin" ? "default" : user.role === "manager" ? "outline" : "secondary"} className="capitalize">
          {user.role}
        </Badge>
      ),
    },
    {
      key: "vertical",
      header: "Vertical",
      cell: (user) => user.vertical || "—",
    },
    {
      key: "active",
      header: "Status",
      cell: (user) => (
        <Badge variant={user.is_active ? "default" : "destructive"}>
          {user.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "created",
      header: "Created",
      cell: (user) => format(new Date(user.created_at), "MMM d, yyyy"),
    },
    {
      key: "actions",
      header: "",
      cell: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/users/${user.id}`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                View Stats
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {user.is_active && (
              <DropdownMenuItem className="text-destructive" onClick={() => onDeactivate(user.id)}>
                <UserX className="mr-2 h-4 w-4" />
                Deactivate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      isLoading={isLoading}
      emptyTitle="No users found"
      emptyDescription="Register your first user to get started."
    />
  );
}

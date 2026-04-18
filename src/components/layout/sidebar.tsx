"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  Bell,
  Settings,
  UserCog,
  Bot,
  Globe,
  BarChart3,
  FileSpreadsheet,
  PhoneCall,
  Megaphone,
  LogOut,
} from "lucide-react";

const mainNav = [
  { href: "/leads", label: "Leads", icon: LayoutDashboard },
  { href: "/calls", label: "Calls", icon: PhoneCall },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const adminNav = [
  { href: "/admin/users", label: "Users", icon: UserCog },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/agents", label: "AI Agents", icon: Bot },
  { href: "/admin/sources", label: "Sources", icon: Globe },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/csv-history", label: "CSV History", icon: FileSpreadsheet },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAdmin, isManager, logout } = useAuthStore();

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  const handleLogout = async () => {
    await fetch("/api/auth/set-cookie", { method: "DELETE" });
    await logout();
    window.location.href = "/login";
  };

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow border-r bg-card">
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b">
          <Link href="/leads" className="text-lg font-bold">
            {process.env.NEXT_PUBLIC_APP_NAME || "Admitverse CRM"}
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}

            {isManager && (
              <>
                <Separator className="my-4" />
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {isAdmin ? "Admin" : "Management"}
                </p>
                {adminNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      pathname.startsWith(item.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </nav>
        </ScrollArea>

        {/* User section */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">
                {user?.role}
              </p>
            </div>
            <div className="flex gap-1">
              <Link href="/settings/profile">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

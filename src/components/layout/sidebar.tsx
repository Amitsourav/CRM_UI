"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useTaskCountStore } from "@/stores/task-count-store";
import { useWebsiteLeadCountStore } from "@/stores/website-lead-count-store";
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
  FileText,
  PhoneCall,
  Megaphone,
  Inbox,
  Landmark,
  IndianRupee,
  LogOut,
  PanelLeftClose,
} from "lucide-react";

// `fmcOnly` items are hidden on Admitverse. Convention matches the rest of
// the codebase (`slug !== "admitverse"` ⇒ FMC), because FMC's slug isn't
// necessarily a fixed string.
const mainNav = [
  { href: "/leads", label: "Leads", icon: LayoutDashboard },
  { href: "/calls", label: "Calls", icon: PhoneCall },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  // Read-only bank-share matrix. Every role can open it — the backend
  // filters restricted roles down to their own leads.
  { href: "/bank-shares", label: "Bank Shares", icon: Landmark, fmcOnly: true },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

// Pre Counsellors don't have access to /admin/reports — give them their own
// daily-activity page in the main nav. Admin/manager use /admin/reports
// (which has the daily view as a tab).
const preCounsellorNav = [
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

interface AdminNavItem {
  href: string;
  label: string;
  icon: typeof UserCog;
  adminOnly?: boolean;
  /** Hidden on Admitverse — see the note on `mainNav`. */
  fmcOnly?: boolean;
}

const adminNav: AdminNavItem[] = [
  // Review inbox for public website form submissions. Manager+ only (the
  // API 403s pre-counsellors), so it lives in this section — which is
  // already gated on isManager.
  { href: "/website-leads", label: "Website Leads", icon: Inbox },
  { href: "/admin/users", label: "Users", icon: UserCog },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/agents", label: "AI Agents", icon: Bot },
  { href: "/admin/sources", label: "Sources", icon: Globe },
  // Commission tracking is FMC-only (Admitverse has no lenders) and admin-only
  // — every endpoint behind both is get_current_admin.
  {
    href: "/reconciliation",
    label: "Commission",
    icon: IndianRupee,
    adminOnly: true,
    fmcOnly: true,
  },
  {
    href: "/admin/lenders",
    label: "Lenders",
    icon: Landmark,
    adminOnly: true,
    fmcOnly: true,
  },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/csv-history", label: "CSV History", icon: FileSpreadsheet },
  // Invoices is strictly admin-only AND FMC-only for now. Admitverse
  // doesn't use this module; hide the nav link there.
  {
    href: "/invoices",
    label: "Invoices",
    icon: FileText,
    adminOnly: true,
    fmcOnly: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, company, isAdmin, isManager, logout } = useAuthStore();
  const taskCount = useTaskCountStore((s) => s.count);
  const newWebsiteLeads = useWebsiteLeadCountStore((s) => s.counts.new);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const hydrated = useSidebarStore((s) => s.hydrated);
  const toggleSidebar = useSidebarStore((s) => s.toggle);

  const isAdmitverse = company?.company_slug === "admitverse";

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
    <div
      className={cn(
        "hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-40",
        // Skipped until the stored preference lands, so a collapsed sidebar
        // doesn't slide away on every page load.
        hydrated && "transition-transform duration-200 motion-reduce:transition-none",
        collapsed && "-translate-x-full"
      )}
      // Kept mounted while hidden so the transition can run; hidden from
      // assistive tech and tab order once it's off-screen.
      aria-hidden={collapsed}
      inert={collapsed}
    >
      <div className="flex flex-col flex-grow border-r bg-card">
        {/* Logo */}
        <div className="flex items-center h-16 gap-2 pl-6 pr-3 border-b">
          <Link href="/leads" className="flex-1 truncate text-lg font-bold">
            {process.env.NEXT_PUBLIC_APP_NAME || "FundMyCampus CRM"}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
            onClick={toggleSidebar}
            aria-label="Hide sidebar"
            title="Hide sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {mainNav
              .filter((item) => !item.fmcOnly || !isAdmitverse)
              .map((item) => (
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
                <span>{item.label}</span>
                {item.href === "/tasks" && taskCount > 0 && (
                  <span className="ml-auto rounded-full bg-red-500 text-white text-[10px] leading-none font-semibold px-1.5 py-0.5 min-w-[1.25rem] text-center">
                    {taskCount}
                  </span>
                )}
              </Link>
            ))}

            {!isManager &&
              preCounsellorNav.map((item) => (
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
                  <span>{item.label}</span>
                </Link>
              ))}

            {isManager && (
              <>
                <Separator className="my-4" />
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {isAdmin ? "Admin" : "Management"}
                </p>
                {adminNav
                  .filter((item) => !item.adminOnly || isAdmin)
                  .filter((item) => !item.fmcOnly || !isAdmitverse)
                  .map((item) => (
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
                    <span>{item.label}</span>
                    {item.href === "/website-leads" && newWebsiteLeads > 0 && (
                      <span className="ml-auto rounded-full bg-red-500 text-white text-[10px] leading-none font-semibold px-1.5 py-0.5 min-w-[1.25rem] text-center">
                        {newWebsiteLeads > 99 ? "99+" : newWebsiteLeads}
                      </span>
                    )}
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

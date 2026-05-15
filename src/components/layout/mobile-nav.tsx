"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useTaskCountStore } from "@/stores/task-count-store";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Menu,
  LayoutDashboard,
  Kanban,
  CheckSquare,
  Bell,
  UserCog,
  Bot,
  Globe,
  BarChart3,
  FileSpreadsheet,
  PhoneCall,
  Megaphone,
} from "lucide-react";

const mainNav = [
  { href: "/leads", label: "Leads", icon: LayoutDashboard },
  { href: "/calls", label: "Calls", icon: PhoneCall },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const preCounsellorNav = [
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

const adminNav = [
  { href: "/admin/users", label: "Users", icon: UserCog },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/agents", label: "AI Agents", icon: Bot },
  { href: "/admin/sources", label: "Sources", icon: Globe },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/csv-history", label: "CSV History", icon: FileSpreadsheet },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isManager = useAuthStore((s) => s.isManager);
  const taskCount = useTaskCountStore((s) => s.count);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden h-9 w-9 p-0">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex items-center h-16 px-6 border-b">
          <span className="text-lg font-bold">
            {process.env.NEXT_PUBLIC_APP_NAME || "FundMyCampus CRM"}
          </span>
        </div>
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
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
                  onClick={() => setOpen(false)}
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
                {adminNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
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
      </SheetContent>
    </Sheet>
  );
}

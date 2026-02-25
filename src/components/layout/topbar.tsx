"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useNotificationPolling } from "@/hooks/use-notifications";
import { MobileNav } from "./mobile-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Bell, Settings, LogOut, Search } from "lucide-react";
import api from "@/lib/api";
import type { Lead } from "@/types";

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useNotificationPolling();

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const { data } = await api.get(`/leads/search?q=${encodeURIComponent(query)}`);
      setSearchResults(Array.isArray(data) ? data : data.items || []);
    } catch {
      setSearchResults([]);
    }
  }, []);

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  // Build breadcrumb
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumb = segments.map((s) =>
    s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );

  const handleLogout = async () => {
    await fetch("/api/auth/set-cookie", { method: "DELETE" });
    await logout();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <MobileNav />

      {/* Breadcrumb */}
      <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
        {breadcrumb.map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span>/</span>}
            <span className={i === breadcrumb.length - 1 ? "text-foreground font-medium" : ""}>
              {item}
            </span>
          </span>
        ))}
      </div>

      <div className="flex-1" />

      {/* Search */}
      <Popover open={searchOpen} onOpenChange={setSearchOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="hidden sm:flex gap-2 text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>Search leads...</span>
            <kbd className="pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium">
              <span className="text-xs">&#8984;</span>K
            </kbd>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search leads by name, email, phone..."
              value={searchQuery}
              onValueChange={handleSearch}
            />
            <CommandList>
              <CommandEmpty>No leads found.</CommandEmpty>
              {searchResults.map((lead) => (
                <CommandItem
                  key={lead.id}
                  onSelect={() => {
                    router.push(`/leads/${lead.id}`);
                    setSearchOpen(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="cursor-pointer"
                >
                  <div>
                    <p className="font-medium">{lead.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.phone || lead.email || "No contact"}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Mobile search */}
      <Button
        variant="ghost"
        size="sm"
        className="sm:hidden h-9 w-9 p-0"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Notifications */}
      <Button
        variant="ghost"
        size="sm"
        className="relative h-9 w-9 p-0"
        onClick={() => router.push("/notifications")}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px] flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/settings/profile")}>
            <Settings className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

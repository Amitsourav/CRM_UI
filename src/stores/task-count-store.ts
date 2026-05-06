import { create } from "zustand";
import api from "@/lib/api";
import { useAuthStore } from "./auth-store";

interface TaskRow {
  id: string;
  due_date?: string;
}

interface PaginatedTasksResponse {
  items?: TaskRow[];
  total?: number;
}

interface TaskCountState {
  count: number;
  refresh: () => Promise<void>;
}

function todayLocalISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const PENDING_PAGE_SIZE = 200;

export const useTaskCountStore = create<TaskCountState>((set) => ({
  count: 0,
  refresh: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) {
      set({ count: 0 });
      return;
    }

    try {
      const [pendingRes, overdueRes] = await Promise.all([
        api.get<PaginatedTasksResponse>(
          `/tasks?status=pending&assigned_to=${userId}&page=1&page_size=${PENDING_PAGE_SIZE}`
        ),
        api.get<PaginatedTasksResponse>(
          `/tasks?status=overdue&assigned_to=${userId}&page=1&page_size=1`
        ),
      ]);

      // Pending tasks include future-dated rows. Filter to "due today or earlier".
      // Comparing the YYYY-MM-DD prefix avoids timezone drift around midnight.
      const todayStr = todayLocalISO();
      const pendingDueByToday = (pendingRes.data.items || []).filter((t) => {
        if (!t.due_date) return false;
        return t.due_date.slice(0, 10) <= todayStr;
      }).length;

      // Overdue tasks are always "due earlier" by definition; backend total is enough.
      const overdueCount = overdueRes.data.total ?? 0;

      set({ count: pendingDueByToday + overdueCount });
    } catch {
      // Silent — keep last good count rather than zeroing on transient failures.
    }
  },
}));

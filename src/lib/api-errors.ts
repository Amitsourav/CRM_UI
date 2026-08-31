import { toast } from "sonner";

interface ApiError {
  response?: { status?: number; data?: { detail?: unknown } };
}

export function errorDetail(error: unknown): string | undefined {
  const detail = (error as ApiError).response?.data?.detail;
  return typeof detail === "string" ? detail : undefined;
}

export function errorStatus(error: unknown): number | undefined {
  return (error as ApiError).response?.status;
}

/**
 * Shows a backend error the way it was written — these `detail` strings are
 * meant for the user, not for logs.
 *
 * Two get extra handling: 403, which is always the same ownership rule and
 * reads better in our words, and the missing commission rate, which can only
 * be fixed on another screen and so carries a way to get there.
 */
export function showApiError(error: unknown, fallback: string): void {
  if (errorStatus(error) === 403) {
    toast.error("This lead isn't assigned to you");
    return;
  }

  const detail = errorDetail(error);
  if (detail && /commission rate/i.test(detail)) {
    toast.error(detail, {
      action: {
        label: "Set rates",
        onClick: () => {
          window.location.href = "/admin/lenders";
        },
      },
      duration: 10000,
    });
    return;
  }

  toast.error(detail || fallback);
}

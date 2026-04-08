import { toast } from "sonner";

const CALL_TOAST_CONFIG: Record<string, { message: string; type: "success" | "error" | "info" }> = {
  initiated: { message: "Calling...", type: "info" },
  ringing: { message: "Ringing...", type: "info" },
  connected: { message: "Connected!", type: "success" },
  ended: { message: "Call ended - saving...", type: "info" },
  failed: { message: "Call failed", type: "error" },
  no_answer: { message: "No answer", type: "info" },
};

export function showCallToast(status: string, phone?: string) {
  const config = CALL_TOAST_CONFIG[status];
  if (!config) return;

  const phoneSuffix = phone ? ` ${phone}` : "";

  switch (config.type) {
    case "success":
      toast.success(config.message + phoneSuffix);
      break;
    case "error":
      toast.error(config.message + phoneSuffix);
      break;
    default:
      toast.info(config.message + phoneSuffix);
  }
}

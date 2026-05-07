"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  campaignService,
  type Campaign,
} from "@/services/campaign-service";
import { bulkResultToast } from "./campaign-bulk-add-dialog";

interface AddCsvImportToCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  csvImportId: string;
  csvFileName?: string;
}

const JOINABLE_STATUSES: Campaign["status"][] = [
  "draft",
  "scheduled",
  "active",
  "paused",
];

export function AddCsvImportToCampaignDialog({
  open,
  onOpenChange,
  csvImportId,
  csvFileName,
}: AddCsvImportToCampaignDialogProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCampaignId("");
    setIsLoading(true);
    campaignService
      .list({ page: 1, page_size: 100 })
      .then((data) => {
        const items: Campaign[] = data.items || data || [];
        setCampaigns(items.filter((c) => JOINABLE_STATUSES.includes(c.status)));
      })
      .catch(() => {
        toast.error("Failed to load campaigns");
      })
      .finally(() => setIsLoading(false));
  }, [open]);

  const handleSubmit = async () => {
    if (!campaignId) {
      toast.error("Pick a campaign");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await campaignService.assignLeadsBulk(campaignId, {
        csv_import_id: csvImportId,
      });
      bulkResultToast(result);
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to bulk-add leads");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add CSV leads to a campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {csvFileName && (
            <p className="text-sm text-muted-foreground">
              Source: <span className="font-medium">{csvFileName}</span>
            </p>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Campaign</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={isLoading ? "Loading…" : "Pick a campaign"}
                />
              </SelectTrigger>
              <SelectContent>
                {!isLoading && campaigns.length === 0 && (
                  <SelectItem value="__none" disabled>
                    No joinable campaigns
                  </SelectItem>
                )}
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span>
                      {c.name}
                      <span className="text-muted-foreground ml-2 text-xs capitalize">
                        ({c.status})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !campaignId}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add to Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import Link from "next/link";
import type { CSVImport } from "@/types";

interface CsvImportProgressProps {
  importId: string;
  columnMapping: Record<string, string>;
  assignedAgentId?: string;
  leadSourceId?: string;
  onReset: () => void;
}

export function CsvImportProgress({
  importId,
  columnMapping,
  assignedAgentId,
  leadSourceId,
  onReset,
}: CsvImportProgressProps) {
  const [status, setStatus] = useState<CSVImport | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const start = async () => {
      try {
        // Filter out "skip" entries from column mapping
        const filteredMapping: Record<string, string> = {};
        for (const [key, value] of Object.entries(columnMapping)) {
          if (value && value !== "skip") {
            filteredMapping[key] = value;
          }
        }

        const requestBody = {
          column_mapping: filteredMapping,
          ...(assignedAgentId ? { assigned_agent_id: assignedAgentId } : {}),
          ...(leadSourceId ? { lead_source_id: leadSourceId } : {}),
        };
        console.log("CSV Process request:", { importId, requestBody });

        const { data } = await api.post<CSVImport>(`/csv/${importId}/process`, requestBody);

        // The backend processes synchronously and returns the result
        setStatus(data);
        setIsProcessing(false);
      } catch (err: unknown) {
        console.error("CSV process error:", err);
        const e = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
        const detail = e.response?.data?.detail;
        const status_code = e.response?.status;
        const msg = detail
          ? `${detail} (HTTP ${status_code})`
          : e.message
            ? `Network error: ${e.message}`
            : "Failed to start processing";
        toast.error(msg);
        setError(msg);
        setIsProcessing(false);
      }
    };
    start();
  }, [importId, columnMapping, assignedAgentId, leadSourceId]);

  if (isProcessing) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
          <p className="font-medium">Processing your CSV import...</p>
          <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
          <Progress className="mt-4 max-w-xs mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <XCircle className="mx-auto h-8 w-8 text-red-500 mb-4" />
          <p className="font-medium">{error || "Something went wrong"}</p>
          <p className="text-sm text-muted-foreground mt-1">The import could not be processed</p>
          <Button className="mt-4" onClick={onReset}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status.status === "completed" ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Import Complete
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                Import Failed
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-md">
              <p className="text-2xl font-bold">{status.total_rows}</p>
              <p className="text-xs text-muted-foreground">Total Rows</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-md">
              <p className="text-2xl font-bold text-green-600">{status.success_count}</p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-md">
              <p className="text-2xl font-bold text-red-600">{status.failure_count}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-md">
              <p className="text-2xl font-bold text-yellow-600">{status.duplicate_count}</p>
              <p className="text-xs text-muted-foreground">Duplicates</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {status.error_details && status.error_details.length > 0 && (
        <Card>
          <CardHeader>
            <Button
              variant="ghost"
              className="w-full justify-between"
              onClick={() => setShowErrors(!showErrors)}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                {status.error_details.length} Errors
              </span>
              <span>{showErrors ? "Hide" : "Show"}</span>
            </Button>
          </CardHeader>
          {showErrors && (
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {status.error_details.map((err, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <Badge variant="outline" className="shrink-0">
                      Row {err.row}
                    </Badge>
                    <span className="text-muted-foreground">{err.error}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <div className="flex gap-3">
        <Link href="/leads">
          <Button>Go to Leads</Button>
        </Link>
        <Button variant="outline" onClick={onReset}>
          Import Another
        </Button>
      </div>
    </div>
  );
}

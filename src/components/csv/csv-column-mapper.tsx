"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { User, LeadSource } from "@/types";

const TARGET_FIELDS = [
  "skip", "full_name", "email", "phone", "alternate_phone", "date_of_birth",
  "gender", "city", "state", "country", "pincode", "highest_qualification",
  "stream", "passing_year", "college_name", "university", "percentage",
  "target_degree", "target_intake", "preferred_countries", "preferred_universities",
  "notes", "tags",
  // Per-row source override. When mapped, the row's value beats the
  // dropdown source below for that lead; empty cells fall back to it.
  // Backend auto-creates new lead_sources entries for unknown names.
  "source",
];

// Headers whose name strongly suggests a Source column. Used as a
// client-side fallback when the backend's suggested_mapping doesn't
// auto-detect — we never overwrite an already-set mapping.
const SOURCE_HEADER_HINTS = /^(source|lead\s*source|channel)$/i;

interface CsvColumnMapperProps {
  importId: string;
  onProcess: (mapping: Record<string, string>, agentId?: string, sourceId?: string) => void;
}

export function CsvColumnMapper({ importId, onProcess }: CsvColumnMapperProps) {
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("none");
  const [selectedSource, setSelectedSource] = useState<string>("none");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [preview, agentRes, sourceRes] = await Promise.all([
          api.post(`/csv/${importId}/preview`),
          api.get("/users?is_active=true").catch(() => ({ data: [] })),
          api.get("/leads/sources/list").catch(() => ({ data: [] })),
        ]);
        const data = preview.data;
        const headers: string[] = data.raw_headers || [];
        const suggested: Record<string, string> = data.suggested_mapping || {};
        // FE fallback: if backend didn't auto-suggest "source" for a
        // header whose name clearly is one, do it client-side so the
        // user doesn't have to map it manually.
        for (const h of headers) {
          if (!suggested[h] && SOURCE_HEADER_HINTS.test(h)) {
            suggested[h] = "source";
          }
        }
        setRawHeaders(headers);
        setMapping(suggested);
        setPreviewRows((data.preview_rows || []).slice(0, 5));
        setAgents(agentRes.data.items || agentRes.data || []);
        setSources(Array.isArray(sourceRes.data) ? sourceRes.data : sourceRes.data.items || []);
      } catch {
        toast.error("Failed to load preview");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [importId]);

  // Inline "+ New source" creator next to the source dropdown.
  const [newSourceName, setNewSourceName] = useState("");
  const [creatingSource, setCreatingSource] = useState(false);
  const handleCreateSource = async () => {
    const name = newSourceName.trim();
    if (!name || creatingSource) return;
    setCreatingSource(true);
    try {
      const { data } = await api.post<LeadSource>("/leads/sources", {
        name,
        source_type: "manual",
      });
      setSources((prev) => [...prev, data]);
      setSelectedSource(data.id);
      setNewSourceName("");
      toast.success(`Source "${data.name}" created`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to create source");
    } finally {
      setCreatingSource(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Column Mapping</h3>
        <div className="space-y-2">
          {rawHeaders.map((header) => (
            <div key={header} className="flex items-center gap-4">
              <span className="text-sm w-40 truncate font-mono bg-muted px-2 py-1 rounded">
                {header}
              </span>
              <span className="text-muted-foreground">→</span>
              <Select
                value={mapping[header] || "skip"}
                onValueChange={(v) => setMapping((prev) => ({ ...prev, [header]: v }))}
              >
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_FIELDS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f === "skip" ? "Skip this column" : f.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {previewRows.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Preview (first {previewRows.length} rows)</h3>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {rawHeaders.map((h) => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, i) => (
                  <TableRow key={i}>
                    {rawHeaders.map((h) => (
                      <TableCell key={h} className="text-xs">
                        {row[h] || ""}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Assign Agent (Optional)</Label>
          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
            <SelectTrigger>
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No agent</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Lead Source (Optional)</Label>
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No source</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Or type a new source…"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreateSource();
                }
              }}
              className="h-9 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreateSource}
              disabled={!newSourceName.trim() || creatingSource}
            >
              {creatingSource ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Rows with a Source column override this dropdown for that lead.
          </p>
        </div>
      </div>

      <Button
        onClick={() =>
          onProcess(
            mapping,
            selectedAgent !== "none" ? selectedAgent : undefined,
            selectedSource !== "none" ? selectedSource : undefined
          )
        }
      >
        Process Import
      </Button>
    </div>
  );
}

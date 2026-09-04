"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminGuard } from "@/components/shared/admin-guard";
import { FmcOnly } from "@/components/shared/fmc-only";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatRate } from "@/lib/money";
import { lendersService } from "@/services/reconciliation-service";
import type { ManagedBank } from "@/types";

function LendersPageContent() {
  const [lenders, setLenders] = useState<ManagedBank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchLenders = useCallback(async () => {
    setIsLoading(true);
    try {
      setLenders(await lendersService.list());
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't load the lenders");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLenders();
  }, [fetchLenders]);

  const unpriced = lenders.filter((l) => l.commission_rate == null);
  // An aggregator is unpriced by design — its sub-products carry the rates.
  // A plain route with no rate is simply unfinished. Different problems,
  // different fixes, so they're counted apart.
  const aggregators = unpriced.filter((l) => l.is_aggregator);
  const needRate = unpriced.filter((l) => !l.is_aggregator);
  // Files sitting on a route with no rate earn nothing until they're moved to
  // a specific one, so the file count is the number that matters, not the
  // lender count.
  const strandedFiles = unpriced.reduce(
    (sum, l) => sum + (l.usage_count ?? 0),
    0
  );
  const aggregatorFiles = aggregators.reduce(
    (sum, l) => sum + (l.usage_count ?? 0),
    0
  );

  const save = async (lender: ManagedBank) => {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      toast.error("Enter a percentage, or clear the field to unset it.");
      return;
    }

    setSavingId(lender.id);
    try {
      await lendersService.setCommissionRate(lender.id, parsed);
      setLenders((prev) =>
        prev.map((l) =>
          l.id === lender.id ? { ...l, commission_rate: parsed } : l
        )
      );
      setEditingId(null);
      toast.success(`${lender.name} updated`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't save the rate");
    } finally {
      setSavingId(null);
    }
  };

  const create = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Name the route.");
      return;
    }
    const trimmed = newRate.trim();
    const rate = trimmed === "" ? null : Number(trimmed);
    if (rate !== null && (!Number.isFinite(rate) || rate < 0)) {
      toast.error("Enter a percentage, or leave it blank to set one later.");
      return;
    }

    setCreating(true);
    try {
      const created = await lendersService.create(name, rate);
      setLenders((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setAddOpen(false);
      setNewName("");
      setNewRate("");
      toast.success(`${created.name} added`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't add the route");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lenders"
        description="Each row is a route, not a bank — the same lender can appear more than once at different rates."
      >
        <Button size="sm" onClick={() => setAddOpen((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Add route
        </Button>
      </PageHeader>

      {addOpen && (
        <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-lender">Route name</Label>
            <Input
              id="new-lender"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="UniCred Propelld Connector"
              className="w-64"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-rate">
              Commission{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <div className="relative w-28">
              <Input
                id="new-rate"
                inputMode="decimal"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="1.35"
                className="pr-7"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <Button onClick={create} disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add
          </Button>
          <Button variant="ghost" onClick={() => setAddOpen(false)}>
            Cancel
          </Button>
          {/* Full route name, since the rate hangs off the route rather than
              the bank — "Axis" and "Axis Direct (UC Code)" are priced apart. */}
          <p className="w-full text-xs text-muted-foreground">
            Use the full route name, the way it should read on the report.
          </p>
        </div>
      )}

      {/* A lender with no rate can't have commission calculated, and marking a
          file disbursed against it fails outright — so this is the blocking
          number, not a nice-to-have. */}
      {!isLoading && unpriced.length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p>
              <span className="font-medium">
                {strandedFiles.toLocaleString()}{" "}
                {strandedFiles === 1 ? "file earns" : "files earn"} nothing
              </span>{" "}
              — they sit on a route with no rate.
            </p>
            <ul className="mt-0.5 space-y-0.5 text-muted-foreground">
              {aggregators.length > 0 && (
                <li>
                  {aggregatorFiles.toLocaleString()} on{" "}
                  {aggregators.length}{" "}
                  {aggregators.length === 1 ? "aggregator" : "aggregators"} (
                  {aggregators.map((l) => l.name).join(", ")}) — these hold no
                  rate by design; move the files to a sub-route.
                </li>
              )}
              {needRate.length > 0 && (
                <li>
                  The other {needRate.length}{" "}
                  {needRate.length === 1 ? "route needs" : "routes need"} a rate
                  set below.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Changing a rate only affects future disbursements. Everything already
        recorded keeps the rate that applied at the time, so renegotiating a
        lender never rewrites what was earned.
      </p>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 font-medium">Route</th>
              <th className="w-24 px-4 py-2 text-right font-medium">Files</th>
              <th className="w-40 px-4 py-2 font-medium">Commission</th>
              <th className="w-24 px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="ml-auto h-4 w-8 animate-pulse rounded bg-muted" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  </td>
                  <td />
                </tr>
              ))}

            {!isLoading && lenders.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No lenders yet.
                </td>
              </tr>
            )}

            {!isLoading &&
              lenders.map((lender) => {
                const unset = lender.commission_rate == null;
                // Straight from the backend now — this used to be inferred
                // from whether the name appeared inside other route names,
                // which couldn't see an aggregator whose sub-products are
                // named differently.
                const ambiguous = lender.is_aggregator === true;
                const editing = editingId === lender.id;
                return (
                  <tr key={lender.id} className="border-b last:border-b-0">
                    {/* Full route name, never shortened to the bank. */}
                    <td className="px-4 py-2 font-medium">{lender.name}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-muted-foreground">
                      {lender.usage_count?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      {editing ? (
                        <div className="relative w-28">
                          <Input
                            autoFocus
                            inputMode="decimal"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") save(lender);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="h-8 pr-7"
                            aria-label={`Commission rate for ${lender.name}`}
                          />
                          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            %
                          </span>
                        </div>
                      ) : (
                        <span
                          className={cn(
                            "font-mono tabular-nums",
                            unset && "text-amber-600"
                          )}
                          title={
                            ambiguous
                              ? "An aggregator with sub-products at different rates — it can't carry one itself. Move these files to a sub-route."
                              : unset
                                ? "Files on this route earn nothing until a rate is set"
                                : undefined
                          }
                        >
                          {ambiguous
                            ? "Aggregator"
                            : unset
                              ? "No rate"
                              : formatRate(lender.commission_rate)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editing ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={savingId === lender.id}
                            onClick={() => save(lender)}
                          >
                            {savingId === lender.id && (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            )}
                            Save
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(lender.id);
                            setValue(
                              lender.commission_rate == null
                                ? ""
                                : String(lender.commission_rate)
                            );
                          }}
                        >
                          {unset ? "Set rate" : "Edit"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LendersPage() {
  return (
    <AdminGuard>
      <FmcOnly>
        <LendersPageContent />
      </FmcOnly>
    </AdminGuard>
  );
}

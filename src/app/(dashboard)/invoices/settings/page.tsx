"use client";

import { useEffect, useRef, useState } from "react";
import { AdminGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  invoiceService,
  INDIAN_STATE_CODES,
  isValidGstin,
  isValidPan,
  type InvoiceSettings,
} from "@/services/invoice-service";

function blankSettings(): InvoiceSettings {
  return {
    invoice_prefix: "FMC",
    default_tax_rate: 18,
  };
}

export default function InvoiceSettingsPage() {
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const sigInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    invoiceService
      .getSettings()
      .then((data) => setSettings(data ?? blankSettings()))
      .catch(() => {
        toast.error("Couldn't load invoice settings");
        setSettings(blankSettings());
      })
      .finally(() => setIsLoading(false));
  }, []);

  const patch = (p: Partial<InvoiceSettings>) =>
    setSettings((prev) => ({ ...(prev ?? blankSettings()), ...p }));

  const validate = (s: InvoiceSettings): string | null => {
    const required: Array<[keyof InvoiceSettings, string]> = [
      ["legal_name", "Legal name"],
      ["gstin", "GSTIN"],
      ["pan", "PAN"],
      ["state_name", "State"],
      ["address_line1", "Address line 1"],
      ["city", "City"],
      ["pincode", "Pincode"],
      ["invoice_prefix", "Invoice prefix"],
    ];
    for (const [key, label] of required) {
      const v = s[key];
      if (v == null || String(v).trim() === "") return `${label} is required`;
    }
    if (!isValidGstin(String(s.gstin))) return "GSTIN doesn't match the expected format";
    if (!isValidPan(String(s.pan))) return "PAN doesn't match the expected format";
    if (
      s.default_tax_rate == null ||
      Number.isNaN(Number(s.default_tax_rate)) ||
      Number(s.default_tax_rate) < 0 ||
      Number(s.default_tax_rate) > 100
    )
      return "Default tax rate must be 0–100";
    return null;
  };

  const handleSave = async () => {
    if (!settings) return;
    const err = validate(settings);
    if (err) {
      toast.error(err);
      return;
    }
    setIsSaving(true);
    try {
      const saved = await invoiceService.saveSettings({
        ...settings,
        gstin: settings.gstin?.trim().toUpperCase(),
        pan: settings.pan?.trim().toUpperCase(),
      });
      setSettings(saved);
      toast.success("Settings saved");
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Couldn't save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const updated = await invoiceService.uploadLogo(file);
      setSettings(updated);
      toast.success("Logo uploaded");
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSigUpload = async (file: File) => {
    setUploadingSig(true);
    try {
      const updated = await invoiceService.uploadSignature(file);
      setSettings(updated);
      toast.success("Signature uploaded");
    } catch (error: unknown) {
      const e = error as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Signature upload failed");
    } finally {
      setUploadingSig(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <AdminGuard>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        <PageHeader
          title="Invoice Settings"
          description="Billing info that appears on every invoice (issuer block)."
        >
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </PageHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="legal-name">Legal name *</Label>
                <Input
                  id="legal-name"
                  value={settings.legal_name ?? ""}
                  onChange={(e) => patch({ legal_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="gstin">GSTIN *</Label>
                  <Input
                    id="gstin"
                    value={settings.gstin ?? ""}
                    onChange={(e) =>
                      patch({ gstin: e.target.value.toUpperCase() })
                    }
                    maxLength={15}
                    className="font-mono tracking-wider"
                  />
                  {settings.gstin && !isValidGstin(settings.gstin) && (
                    <p className="text-[11px] text-red-600">Invalid GSTIN format</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pan">PAN *</Label>
                  <Input
                    id="pan"
                    value={settings.pan ?? ""}
                    onChange={(e) =>
                      patch({ pan: e.target.value.toUpperCase() })
                    }
                    maxLength={10}
                    className="font-mono tracking-wider"
                  />
                  {settings.pan && !isValidPan(settings.pan) && (
                    <p className="text-[11px] text-red-600">Invalid PAN format</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email ?? ""}
                    onChange={(e) => patch({ email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={settings.phone ?? ""}
                    onChange={(e) => patch({ phone: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="addr1">Address line 1 *</Label>
                <Input
                  id="addr1"
                  value={settings.address_line1 ?? ""}
                  onChange={(e) => patch({ address_line1: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="addr2">Address line 2</Label>
                <Input
                  id="addr2"
                  value={settings.address_line2 ?? ""}
                  onChange={(e) => patch({ address_line2: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={settings.city ?? ""}
                    onChange={(e) => patch({ city: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>State *</Label>
                  <Select
                    value={settings.state_name ?? ""}
                    onValueChange={(v) => patch({ state_name: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATE_CODES.map((s) => (
                        <SelectItem key={s.code} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    value={settings.pincode ?? ""}
                    onChange={(e) => patch({ pincode: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bank details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="acct-holder">Account holder</Label>
                  <Input
                    id="acct-holder"
                    value={settings.bank_account_holder ?? ""}
                    onChange={(e) =>
                      patch({ bank_account_holder: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acct">Account number</Label>
                  <Input
                    id="acct"
                    value={settings.bank_account_number ?? ""}
                    onChange={(e) =>
                      patch({ bank_account_number: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ifsc">IFSC</Label>
                  <Input
                    id="ifsc"
                    value={settings.bank_ifsc ?? ""}
                    onChange={(e) => patch({ bank_ifsc: e.target.value })}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bank-name">Bank name</Label>
                  <Input
                    id="bank-name"
                    value={settings.bank_name ?? ""}
                    onChange={(e) => patch({ bank_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  value={settings.bank_branch ?? ""}
                  onChange={(e) => patch({ bank_branch: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prefix">Invoice prefix *</Label>
                  <Input
                    id="prefix"
                    value={settings.invoice_prefix ?? "FMC"}
                    onChange={(e) =>
                      patch({ invoice_prefix: e.target.value })
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Used in invoice numbers e.g. {settings.invoice_prefix || "FMC"}/2026-27/001.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tax">Default tax rate (%) *</Label>
                  <Input
                    id="tax"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={settings.default_tax_rate ?? 18}
                    onChange={(e) =>
                      patch({
                        default_tax_rate: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="terms">Default terms</Label>
                <Textarea
                  id="terms"
                  rows={3}
                  value={settings.default_terms ?? ""}
                  onChange={(e) => patch({ default_terms: e.target.value })}
                  placeholder="Payment due within 14 days; late fee 1.5%/month…"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brand assets</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div>
              <Label className="text-sm">Logo</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-16 w-16 rounded border bg-muted/30 flex items-center justify-center overflow-hidden">
                  {settings.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.logo_url}
                      alt="Logo"
                      className="max-h-full max-w-full"
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      No logo
                    </span>
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleLogoUpload(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {uploadingLogo ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload logo
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-sm">Authorised signature</Label>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-16 w-32 rounded border bg-muted/30 flex items-center justify-center overflow-hidden">
                  {settings.signature_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.signature_url}
                      alt="Signature"
                      className="max-h-full max-w-full"
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      No signature
                    </span>
                  )}
                </div>
                <input
                  ref={sigInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleSigUpload(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingSig}
                  onClick={() => sigInputRef.current?.click()}
                >
                  {uploadingSig ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Upload signature
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}

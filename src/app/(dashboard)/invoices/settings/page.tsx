"use client";

import { useEffect, useRef, useState } from "react";
import { AdminGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  INDIAN_STATES,
  type InvoiceSettings,
} from "@/services/invoice-service";

export default function InvoiceSettingsPage() {
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const sigInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSig, setUploadingSig] = useState(false);

  useEffect(() => {
    invoiceService
      .getSettings()
      .then((data) => setSettings(data))
      .catch(() => {
        toast.error("Couldn't load invoice settings");
        setSettings({});
      })
      .finally(() => setIsLoading(false));
  }, []);

  const patch = (p: Partial<InvoiceSettings>) =>
    setSettings((prev) => ({ ...(prev ?? {}), ...p }));

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const saved = await invoiceService.saveSettings(settings);
      setSettings(saved);
      toast.success("Settings saved");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Couldn't save settings");
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
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Logo upload failed");
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
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Signature upload failed");
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
                <Label htmlFor="legal-name">Legal name</Label>
                <Input
                  id="legal-name"
                  value={settings.legal_name ?? ""}
                  onChange={(e) => patch({ legal_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="gstin">GSTIN</Label>
                  <Input
                    id="gstin"
                    value={settings.gstin ?? ""}
                    onChange={(e) => patch({ gstin: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pan">PAN</Label>
                  <Input
                    id="pan"
                    value={settings.pan ?? ""}
                    onChange={(e) => patch({ pan: e.target.value })}
                  />
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
                <Label htmlFor="addr1">Address line 1</Label>
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
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={settings.city ?? ""}
                    onChange={(e) => patch({ city: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Select
                    value={settings.state ?? ""}
                    onValueChange={(v) => patch({ state: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pincode">Pincode</Label>
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
                  <Label htmlFor="bank">Bank name</Label>
                  <Input
                    id="bank"
                    value={settings.bank_name ?? ""}
                    onChange={(e) => patch({ bank_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="branch">Branch</Label>
                  <Input
                    id="branch"
                    value={settings.bank_branch ?? ""}
                    onChange={(e) => patch({ bank_branch: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1.5">
                  <Label htmlFor="ifsc">IFSC</Label>
                  <Input
                    id="ifsc"
                    value={settings.bank_ifsc ?? ""}
                    onChange={(e) => patch({ bank_ifsc: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brand assets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    accept="image/*"
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
                    accept="image/*"
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

      </div>
    </AdminGuard>
  );
}

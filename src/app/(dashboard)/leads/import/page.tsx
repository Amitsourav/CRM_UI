"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { CsvUpload } from "@/components/csv/csv-upload";
import { CsvColumnMapper } from "@/components/csv/csv-column-mapper";
import { CsvImportProgress } from "@/components/csv/csv-import-progress";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";

export default function CsvImportPage() {
  // Pre-counsellors can't create leads on the backend, so the
  // upload/preview/process endpoints would all 403. Bounce them back
  // to the leads list instead of showing a UI that's guaranteed to
  // fail when submitted.
  const router = useRouter();
  const isPreCounsellor = useAuthStore((s) => s.isPreCounsellor);
  const [step, setStep] = useState(1);
  const [importId, setImportId] = useState("");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [assignedAgentId, setAssignedAgentId] = useState<string | undefined>();
  const [leadSourceId, setLeadSourceId] = useState<string | undefined>();
  useEffect(() => {
    if (isPreCounsellor) router.replace("/leads");
  }, [isPreCounsellor, router]);
  if (isPreCounsellor) return null;

  const handleUploadComplete = (id: string) => {
    setImportId(id);
    setStep(2);
  };

  const handleProcess = (
    mapping: Record<string, string>,
    agentId?: string,
    sourceId?: string
  ) => {
    setColumnMapping(mapping);
    setAssignedAgentId(agentId);
    setLeadSourceId(sourceId);
    setStep(3);
  };

  const handleReset = () => {
    setStep(1);
    setImportId("");
    setColumnMapping({});
    setAssignedAgentId(undefined);
    setLeadSourceId(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Leads from CSV"
        description="Upload a CSV file to bulk import leads"
      >
        <Badge variant="outline">Step {step} of 3</Badge>
      </PageHeader>

      {step === 1 && <CsvUpload onUploadComplete={handleUploadComplete} />}
      {step === 2 && (
        <CsvColumnMapper importId={importId} onProcess={handleProcess} />
      )}
      {step === 3 && (
        <CsvImportProgress
          importId={importId}
          columnMapping={columnMapping}
          assignedAgentId={assignedAgentId}
          leadSourceId={leadSourceId}
          onReset={handleReset}
        />
      )}
    </div>
  );
}

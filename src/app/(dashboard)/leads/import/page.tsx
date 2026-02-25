"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { CsvUpload } from "@/components/csv/csv-upload";
import { CsvColumnMapper } from "@/components/csv/csv-column-mapper";
import { CsvImportProgress } from "@/components/csv/csv-import-progress";
import { Badge } from "@/components/ui/badge";

export default function CsvImportPage() {
  const [step, setStep] = useState(1);
  const [importId, setImportId] = useState("");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [assignedAgentId, setAssignedAgentId] = useState<string | undefined>();
  const [leadSourceId, setLeadSourceId] = useState<string | undefined>();

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

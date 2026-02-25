"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface CsvUploadProps {
  onUploadComplete: (importId: string) => void;
}

export function CsvUpload({ onUploadComplete }: CsvUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (!f.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/csv/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("File uploaded successfully");
      onUploadComplete(data.import_id || data.id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      toast.error(err.response?.data?.detail || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get("/csv/template", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "lead_import_template.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error("Failed to download template");
    }
  };

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Drop a CSV file here or click to browse</p>
        <p className="text-xs text-muted-foreground mt-1">Only .csv files are accepted</p>
      </Card>

      {file && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <Button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload
          </Button>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
        <Download className="mr-2 h-4 w-4" />
        Download Template
      </Button>
    </div>
  );
}

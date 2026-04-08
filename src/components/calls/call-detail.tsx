"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SentimentBadge } from "./sentiment-badge";
import { CallStatusBadge } from "./call-status-badge";
import {
  Phone,
  Bot,
  User,
  Clock,
  DollarSign,
  Copy,
  Check,
  FileText,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { CallAttempt, CallAttemptWithLead } from "@/types";

interface CallDetailProps {
  call: CallAttempt | CallAttemptWithLead;
  onClose?: () => void;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CallDetail({ call }: CallDetailProps) {
  const [copied, setCopied] = useState(false);
  const leadName = "lead_name" in call ? call.lead_name : undefined;
  const leadPhone = "lead_phone" in call ? call.lead_phone : undefined;
  const agentName = "agent_name" in call ? call.agent_name : undefined;

  const copyTranscript = async () => {
    if (!call.transcript) return;
    await navigator.clipboard.writeText(call.transcript);
    setCopied(true);
    toast.success("Transcript copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ScrollArea className="h-[calc(100vh-100px)]">
      <div className="space-y-4 pr-4 pb-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">{leadName || "Unknown Lead"}</h3>
              {leadPhone && (
                <p className="text-sm text-muted-foreground">{leadPhone}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={call.call_type === "ai" ? "default" : "secondary"} className="text-xs">
              {call.call_type === "ai" ? "AI Call" : "Live Call"}
            </Badge>
            <CallStatusBadge status={call.call_status} />
            <SentimentBadge sentiment={call.sentiment} score={call.sentiment_score} />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{format(new Date(call.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(call.call_duration_seconds)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Call Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Call Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {agentName && (
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">AI Agent:</span>
                <span className="font-medium">{agentName}</span>
              </div>
            )}
            {call.telecaller_id && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Telecaller:</span>
                <span className="font-medium">{call.telecaller_id}</span>
              </div>
            )}
            {call.cost !== undefined && call.cost !== null && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-medium">${call.cost.toFixed(2)}</span>
              </div>
            )}
            {call.call_recording_url && (
              <div className="pt-2">
                <p className="text-muted-foreground mb-2">Recording:</p>
                <audio controls className="w-full" preload="metadata">
                  <source src={call.call_recording_url} />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {call.summary ? (
              <p className="text-sm leading-relaxed">{call.summary}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No summary available</p>
            )}
          </CardContent>
        </Card>

        {/* Transcript */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Full Transcript
              </CardTitle>
              {call.transcript && (
                <Button variant="ghost" size="sm" onClick={copyTranscript}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {call.transcript ? (
              <div className="max-h-[300px] overflow-y-auto">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {call.transcript}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No transcript available</p>
            )}
          </CardContent>
        </Card>

        {/* Call Notes */}
        {(call.conversation_notes || call.agent_agenda || call.disposition) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Call Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {call.disposition && (
                <div>
                  <span className="text-muted-foreground">Disposition: </span>
                  <Badge variant="outline" className="capitalize">
                    {call.disposition.replace(/_/g, " ")}
                  </Badge>
                </div>
              )}
              {call.conversation_notes && (
                <div>
                  <p className="text-muted-foreground mb-1">Notes:</p>
                  <p className="leading-relaxed">{call.conversation_notes}</p>
                </div>
              )}
              {call.agent_agenda && (
                <div>
                  <p className="text-muted-foreground mb-1">Agenda:</p>
                  <p className="leading-relaxed">{call.agent_agenda}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}

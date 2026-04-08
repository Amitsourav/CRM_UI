"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { useAgents } from "@/hooks/use-agents";
import {
  startCall,
  getCallStatus,
} from "@/services/voice-service";
import { useVoiceStore } from "@/stores/voice-store";
import type { AIAgent } from "@/types";

interface StartCallButtonProps {
  lead_id: string;
  lead_name: string;
  phone_number: string;
  onCallEnd?: (call_id: string) => void;
}

type CallState =
  | "idle"
  | "selecting"
  | "calling"
  | "ringing"
  | "connected"
  | "ended"
  | "failed";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function StartCallButton({
  lead_id,
  lead_name,
  phone_number,
  onCallEnd,
}: StartCallButtonProps) {
  const { agents } = useAgents();
  const setLastCallFailed = useVoiceStore((s) => s.setLastCallFailed);
  const [inFlight, setInFlight] = useState(false);
  const [callState, setCallState] = useState<CallState>("idle");
  const [callId, setCallId] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [duration, setDuration] = useState(0);
  const [turns, setTurns] = useState(0);
  const [language, setLanguage] = useState("en");
  const [finalDuration, setFinalDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  // 60-second ringing watchdog: if we stay in "ringing" too long without
  // transitioning to "connected" / "ended" / "failed", force-fail the UI.
  useEffect(() => {
    if (callState !== "ringing") return;
    const timeout = setTimeout(() => {
      setCallState("failed");
      setErrorMessage("Call timed out — no answer");
      setLastCallFailed(true);
    }, 60000);
    return () => clearTimeout(timeout);
  }, [callState, setLastCallFailed]);

  // Polling lives inside a useEffect driven by (callId, callState).
  // When callState becomes "ended" / "failed" / anything non-active, the
  // effect re-runs, the cleanup tears down the previous interval, and the
  // new run early-returns — no zombie intervals can survive.
  useEffect(() => {
    if (!callId) return;
    if (callState !== "ringing" && callState !== "connected") return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        const status = await getCallStatus(callId);
        if (cancelled) return;

        setDuration(status.duration || 0);
        setTurns(status.turns || 0);
        setLanguage(status.language || "en");

        if (status.status === "connected") {
          setCallState("connected");
        }

        if (
          status.status === "ended" ||
          status.status === "failed" ||
          !status.is_live
        ) {
          setFinalDuration(status.duration || 0);
          if (status.status === "ended") {
            setCallState("ended");
            onCallEnd?.(callId);
          } else {
            setCallState("failed");
            setErrorMessage("Call disconnected");
            setLastCallFailed(true);
          }
        }
      } catch (error: unknown) {
        if (cancelled) return;
        const err = error as {
          response?: { status?: number; data?: { detail?: string } };
        };
        const httpStatus = err.response?.status;
        // Any 4xx (call no longer exists / unauthorized / bad request)
        // OR any other failure → stop and surface the backend message.
        setCallState("failed");
        setErrorMessage(
          err.response?.data?.detail ||
            (httpStatus && httpStatus >= 400 && httpStatus < 500
              ? "Call no longer available"
              : "Lost connection to server")
        );
        setLastCallFailed(true);
      }
    };

    const interval = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, callState]);

  const handleAgentSelect = async (agent: AIAgent) => {
    if (inFlight) return;
    setInFlight(true);
    setSelectedAgent(agent);
    setCallState("calling");
    // Reset failure flag on a new attempt — re-enable active-calls polling
    setLastCallFailed(false);
    try {
      const response = await startCall({
        lead_id,
        agent_id: agent.id,
        phone_number,
        lead_name,
      });
      setCallId(response.call_id);
      setCallState("ringing");
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { detail?: string } };
      };
      setErrorMessage(err.response?.data?.detail || "Failed to start call");
      setCallState("failed");
      // Mark failed so ActiveCallsBar stops hammering /active-calls
      setLastCallFailed(true);
    } finally {
      setInFlight(false);
    }
  };

  const handleStartClick = () => {
    if (agents.length === 1) {
      handleAgentSelect(agents[0]);
    } else {
      const def = agents.find((a) => a.is_default);
      if (def && agents.length === 0) {
        handleAgentSelect(def);
      } else {
        setCallState("selecting");
      }
    }
  };

  if (callState === "idle") {
    return (
      <button
        type="button"
        onClick={handleStartClick}
        disabled={inFlight}
        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <Phone className="w-4 h-4" />
        Start AI Call
      </button>
    );
  }

  if (callState === "selecting") {
    return (
      <div className="border rounded-lg p-3 bg-white shadow-sm w-72">
        <p className="text-sm font-medium mb-2">Select AI Agent</p>
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            onClick={() => handleAgentSelect(agent)}
            className="w-full text-left p-2 rounded hover:bg-gray-50 border mb-1"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">{agent.name}</span>
              {agent.is_default && (
                <span className="text-xs bg-green-100 text-green-700 px-2 rounded-full">
                  DEFAULT
                </span>
              )}
            </div>
            {agent.pricing?.total_inr !== undefined && (
              <p className="text-xs text-gray-500">
                ₹{agent.pricing.total_inr.toFixed(2)}/min
              </p>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCallState("idle")}
          className="text-xs text-gray-500 hover:underline mt-1"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (callState === "calling") {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-green-600 rounded-full" />
        Initiating call...
      </div>
    );
  }

  if (callState === "ringing") {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg bg-yellow-50 w-64">
        <div className="animate-pulse w-3 h-3 bg-yellow-500 rounded-full" />
        <div>
          <p className="text-sm font-medium">Ringing...</p>
          <p className="text-xs text-gray-500">{phone_number}</p>
        </div>
      </div>
    );
  }

  if (callState === "connected") {
    return (
      <div className="p-3 border-2 border-green-500 rounded-lg bg-green-50 w-64">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-700">Live Call</span>
          </div>
          <span className="text-sm font-mono text-gray-600 font-medium">
            {formatDuration(duration)}
          </span>
        </div>
        <div className="flex gap-3 text-xs text-gray-500 mb-3">
          <span>Turns: {turns}</span>
          <span>{language === "hi" ? "🇮🇳 Hinglish" : "🇺🇸 English"}</span>
        </div>
        <div className="text-xs text-gray-400 mb-2">
          Agent: {selectedAgent?.name}
        </div>
      </div>
    );
  }

  if (callState === "ended") {
    return (
      <div className="p-3 border rounded-lg bg-gray-50 w-64">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-green-600 text-lg">✓</span>
          <span className="text-sm font-medium">Call Ended</span>
        </div>
        <p className="text-xs text-gray-500 mb-1">
          Duration: {formatDuration(finalDuration)}
        </p>
        <p className="text-xs text-gray-500 mb-2">Turns: {turns}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCallState("idle")}
            className="text-xs text-blue-600 hover:underline"
          >
            Make another call
          </button>
          {onCallEnd && (
            <button
              type="button"
              onClick={() => onCallEnd(callId)}
              className="text-xs text-gray-600 hover:underline"
            >
              View transcript →
            </button>
          )}
        </div>
      </div>
    );
  }

  if (callState === "failed") {
    return (
      <div className="p-3 border border-red-200 rounded-lg bg-red-50 w-64">
        <p className="text-sm font-medium text-red-700 mb-1">Call Failed</p>
        <p className="text-xs text-red-500 mb-2">{errorMessage}</p>
        <button
          type="button"
          onClick={() => setCallState("idle")}
          className="text-xs text-red-600 hover:underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  return null;
}

"use client";

import { useEffect, useState, useRef } from "react";
import { ManagerGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { AgentCard } from "@/components/agents/agent-card";
import { AgentForm } from "@/components/agents/agent-form";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Bot, RefreshCw, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { agentService } from "@/services/agent-service";
import type { AIAgent } from "@/types";

interface ChatMessage {
  role: "user" | "agent";
  content: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | undefined>();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState<AIAgent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Test panel
  const [testOpen, setTestOpen] = useState(false);
  const [testAgent, setTestAgent] = useState<AIAgent | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await agentService.getAll();
      setAgents(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "Failed to load agents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCreate = () => {
    setEditingAgent(undefined);
    setFormOpen(true);
  };

  const handleEdit = (agent: AIAgent) => {
    setEditingAgent(agent);
    setFormOpen(true);
  };

  const handleDeleteClick = (agent: AIAgent) => {
    if (agent.is_default) {
      toast.error(
        "Cannot delete default agent. Set another agent as default first."
      );
      return;
    }
    setDeletingAgent(agent);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAgent) return;
    setIsDeleting(true);
    try {
      await agentService.delete(deletingAgent.id);
      toast.success("Agent deleted");
      refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Failed to delete agent");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
      setDeletingAgent(null);
    }
  };

  const handleClone = async (agent: AIAgent) => {
    try {
      await agentService.clone(agent.id);
      toast.success("Agent cloned");
      refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Failed to clone agent");
    }
  };

  const handleSetDefault = async (agent: AIAgent) => {
    try {
      await agentService.setDefault(agent.id);
      toast.success("Default agent updated");
      refetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Failed to set default");
    }
  };

  const handleTest = (agent: AIAgent) => {
    setTestAgent(agent);
    setMessages([]);
    setChatHistory([]);
    setChatInput("");
    setTestOpen(true);
    // Auto-send first "Hello"
    sendMessage(agent, "Hello", []);
  };

  const sendMessage = async (
    agent: AIAgent,
    text: string,
    history: Array<{ role: string; content: string }>
  ) => {
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsSending(true);
    try {
      const res = await agentService.testChat(agent.id, text, history);
      setMessages((prev) => [...prev, { role: "agent", content: res.response }]);
      if (res.history) {
        setChatHistory(res.history);
      } else {
        setChatHistory([
          ...history,
          { role: "user", content: text },
          { role: "assistant", content: res.response },
        ]);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Test failed");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendChat = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!testAgent || !chatInput.trim()) return;
    sendMessage(testAgent, chatInput, chatHistory);
    setChatInput("");
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingAgent(undefined);
    refetch();
  };

  // Stats
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.is_active).length;
  const avgCost =
    agents.length > 0
      ? agents.reduce((s, a) => s + (a.pricing?.total_inr || 0), 0) / agents.length
      : 0;

  return (
    <ManagerGuard>
      <div className="space-y-6">
        <PageHeader
          title="AI Agents"
          description="Configure AI agents for voice calling"
        >
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Agent
          </Button>
        </PageHeader>

        {/* Stats */}
        {!isLoading && !error && agents.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 bg-background">
              <p className="text-xs text-muted-foreground">Total Agents</p>
              <p className="text-2xl font-semibold mt-1">{totalAgents}</p>
            </div>
            <div className="border rounded-lg p-4 bg-background">
              <p className="text-xs text-muted-foreground">Active Agents</p>
              <p className="text-2xl font-semibold mt-1">{activeAgents}</p>
            </div>
            <div className="border rounded-lg p-4 bg-background">
              <p className="text-xs text-muted-foreground">Avg Cost/min</p>
              <p className="text-2xl font-semibold mt-1">₹{avgCost.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button variant="outline" onClick={refetch}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && agents.length === 0 && (
          <EmptyState
            icon={Bot}
            title="No AI agents yet"
            description="Create your first AI agent to start making calls"
            actionLabel="+ Create Agent"
            onAction={handleCreate}
          />
        )}

        {/* Grid */}
        {!isLoading && !error && agents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onClone={handleClone}
                onSetDefault={handleSetDefault}
                onTest={handleTest}
              />
            ))}
          </div>
        )}

        {/* Form sheet */}
        <Sheet open={formOpen} onOpenChange={setFormOpen}>
          <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col h-full gap-0">
            <SheetHeader className="border-b flex-shrink-0">
              <SheetTitle>{editingAgent ? "Edit Agent" : "New Agent"}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 min-h-0 p-4">
              {formOpen && (
                <AgentForm
                  agent={editingAgent}
                  onSuccess={handleFormSuccess}
                  onCancel={() => setFormOpen(false)}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Test panel */}
        <Sheet
          open={testOpen}
          onOpenChange={(o) => {
            setTestOpen(o);
            if (!o) {
              setChatHistory([]);
              setMessages([]);
            }
          }}
        >
          <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
            <SheetHeader className="border-b">
              <SheetTitle>Test Agent: {testAgent?.name}</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && !isSending && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No messages yet
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendChat} className="border-t p-3 flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                disabled={isSending}
              />
              <Button type="submit" size="icon" disabled={isSending || !chatInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </SheetContent>
        </Sheet>

        {/* Delete confirm */}
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete Agent"
          description={`Are you sure you want to delete "${deletingAgent?.name}"? This action cannot be undone.`}
          confirmLabel={isDeleting ? "Deleting..." : "Delete"}
          onConfirm={handleDeleteConfirm}
          destructive
        />
      </div>
    </ManagerGuard>
  );
}

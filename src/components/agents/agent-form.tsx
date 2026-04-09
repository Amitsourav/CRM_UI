"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { agentService } from "@/services/agent-service";
import type { AIAgent, ProviderOptions } from "@/types";

interface AgentFormProps {
  agent?: AIAgent;
  onSuccess: (agent: AIAgent) => void;
  onCancel: () => void;
}

const DEFAULTS: Partial<AIAgent> = {
  name: "",
  role: "sales",
  tone: "friendly",
  is_default: false,
  is_active: true,
  system_prompt: `LANGUAGE RULE — HIGHEST PRIORITY:
Check user's CURRENT message language.
Reply in EXACT same language.
Check ONLY current message.
Ignore all previous messages language.

IF user message is mostly English:
(I, my, you, your, what, how, when,
 where, which, yes, no, okay, sure,
 hello, hi, tell, give, want, need,
 looking, interest, rate, loan, country)
→ REPLY IN ENGLISH ONLY ✅
Example: "Great! Which country are
          you targeting for your MBA?"

IF user message has Hindi words:
(haan, nahi, kya, kitna, chahiye,
 hai, ho, main, aap, toh, abhi,
 achha, bilkul, matlab, milega,
 batao, theek, zaroor, samjha)
→ REPLY IN HINGLISH ✅
Example: "Achha! USA ke liye ₹40-60
          Lakhs average hota hai!"

SWITCH EVERY SINGLE MESSAGE.

EXAMPLES:
User: "tell me about interest rates"
→ ENGLISH reply ✅

User: "kitna loan milega"
→ HINGLISH reply ✅

User: "okay I understand"
→ ENGLISH reply ✅

User: "haan main interested hoon"
→ HINGLISH reply ✅`,
  welcome_message: "Hello! Am I speaking with {name}?",
  final_message_en: "Thank you for your time! Have a great day. Goodbye!",
  final_message_hi: "Bahut shukriya! Aapka din achha rahe. Alvida!",
  silence_message_en: "Hey, are you still there?",
  silence_message_hi: "Hello? Kya aap abhi bhi wahan hain?",
  llm_provider: "openrouter",
  llm_model: "openai/gpt-4o-mini",
  llm_temperature: 0.3,
  llm_max_tokens: 100,
  stt_provider: "sarvam",
  stt_model: "saaras:v3",
  stt_keywords: "",
  tts_provider: "sarvam",
  tts_model: "bulbul:v3",
  tts_voice: "simran",
  tts_gender: "female",
  tts_speed: 1.0,
  tts_buffer_size: 200,
  tts_stability: 0.5,
  tts_similarity_boost: 0.75,
  primary_language: "en",
  secondary_language: "hi",
  auto_language_switch: true,
  language_style: "mirror_user",
  endpointing_ms: 250,
  linear_delay_ms: 400,
  words_before_interrupt: 3,
  max_response_words: 25,
  precise_transcript: true,
  telephony_provider: "plivo",
  phone_number: "",
  call_timeout_seconds: 600,
  hangup_on_silence_seconds: 10,
  call_start_time: "09:00",
  call_end_time: "19:00",
  restrict_call_hours: true,
  voicemail_detection: true,
  noise_cancellation: true,
  noise_cancellation_level: 60,
  ambient_noise: "office-ambience",
  silence_detection_seconds: 9,
  webhook_url: "",
  tts_provider_english: "",
  tts_model_english: "",
  tts_voice_english: "",
  tts_provider_hindi: "",
  tts_model_hindi: "",
  tts_voice_hindi: "",
};

const TTS_MODELS_ENGLISH: Record<string, string> = {
  smallest: "lightning-v2",
  elevenlabs: "eleven_turbo_v2_5",
  cartesia: "sonic-2",
  sarvam: "bulbul:v3",
};

const TTS_MODELS_HINDI: Record<string, string> = {
  sarvam: "bulbul:v3",
};

const STT_MODELS: Record<string, { value: string; label: string }[]> = {
  sarvam: [{ value: "saaras:v3", label: "saaras:v3" }],
  deepgram: [
    { value: "nova-2", label: "nova-2" },
    { value: "nova-3", label: "nova-3" },
  ],
  azure: [{ value: "azure-speech", label: "azure-speech" }],
};

const TTS_MODELS: Record<string, { value: string; label: string }[]> = {
  sarvam: [
    { value: "bulbul:v3", label: "bulbul:v3" },
    { value: "bulbul:v2", label: "bulbul:v2" },
  ],
  smallest: [{ value: "lightning-v2", label: "lightning-v2" }],
  elevenlabs: [{ value: "eleven_turbo_v2_5", label: "eleven_turbo_v2_5" }],
  cartesia: [{ value: "sonic", label: "sonic" }],
};

const STT_COSTS: Record<string, number> = {
  sarvam: 0.002,
  deepgram: 0.004,
  azure: 0.003,
};
const TTS_COSTS: Record<string, number> = {
  sarvam: 0.002,
  smallest: 0.003,
  elevenlabs: 0.03,
  cartesia: 0.005,
};
const LLM_COST_PER_MIN: Record<string, number> = {
  // Groq via OpenRouter — new
  "meta-llama/llama-3.3-70b-instruct": 0.0008,
  "meta-llama/llama-3.1-8b-instruct": 0.0002,
  "google/gemini-flash-1.5-8b": 0.0003,
  // existing
  "openai/gpt-4o-mini": 0.0030,
  "openai/gpt-4o": 0.0150,
  "openai/gpt-4.1-mini": 0.0030,
  "openai/gpt-4.1": 0.0120,
  "openai/gpt-4.1-nano": 0.0010,
  "anthropic/claude-3-haiku-20240307": 0.0020,
  "anthropic/claude-sonnet-4": 0.0200,
};

function llmCost(model: string): number {
  if (!model) return 0.003;
  return LLM_COST_PER_MIN[model] ?? 0.003;
}

export function AgentForm({ agent, onSuccess, onCancel }: AgentFormProps) {
  const isEdit = !!agent;
  const [options, setOptions] = useState<ProviderOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tab, setTab] = useState("identity");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tabErrors, setTabErrors] = useState<string[]>([]);
  const [form, setForm] = useState<Partial<AIAgent>>(
    agent ? { ...DEFAULTS, ...agent } : { ...DEFAULTS }
  );
  const [dualTtsEnabled, setDualTtsEnabled] = useState(false);

  useEffect(() => {
    setForm(agent ? { ...DEFAULTS, ...agent } : { ...DEFAULTS });
    setFieldErrors({});
    setTabErrors([]);
  }, [agent]);

  useEffect(() => {
    if (agent?.tts_provider_english && agent?.tts_provider_hindi) {
      setDualTtsEnabled(true);
    } else {
      setDualTtsEnabled(false);
    }
  }, [agent]);

  useEffect(() => {
    let mounted = true;
    agentService
      .getOptions()
      .then((data) => {
        if (mounted) setOptions(data);
      })
      .catch(() => {
        if (mounted) toast.error("Failed to load agent options");
      })
      .finally(() => {
        if (mounted) setOptionsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const update = <K extends keyof AIAgent>(key: K, value: AIAgent[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key as string]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  // Pricing calculation
  const pricing = useMemo(() => {
    const stt = STT_COSTS[form.stt_provider || "sarvam"] || 0.002;
    const tts = TTS_COSTS[form.tts_provider || "sarvam"] || 0.002;
    const llm = llmCost(form.llm_model || "");
    const tel = 0.01;
    const total = stt + tts + llm + tel;
    const totalInr = total * 83;
    const monthly = Math.round(totalInr * 1000);
    const sumPct = stt + tts + llm + tel;
    return {
      total,
      totalInr,
      monthly,
      stt,
      tts,
      llm,
      tel,
      stt_pct: (stt / sumPct) * 100,
      tts_pct: (tts / sumPct) * 100,
      llm_pct: (llm / sumPct) * 100,
      tel_pct: (tel / sumPct) * 100,
    };
  }, [form.stt_provider, form.tts_provider, form.llm_model]);

  const sttModels = STT_MODELS[form.stt_provider || "sarvam"] || [];
  const ttsModels = TTS_MODELS[form.tts_provider || "sarvam"] || [];

  const voiceList = useMemo(() => {
    if (!options) return [];
    const provider = form.tts_provider || "sarvam";
    const gender = form.tts_gender || "female";
    return options.voices?.[provider]?.[gender] || [];
  }, [options, form.tts_provider, form.tts_gender]);

  // When provider/gender changes, ensure voice is valid
  useEffect(() => {
    if (voiceList.length > 0 && !voiceList.find((v) => v.value === form.tts_voice)) {
      update("tts_voice", voiceList[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceList]);

  // When STT provider changes, set first model
  useEffect(() => {
    if (sttModels.length && !sttModels.find((m) => m.value === form.stt_model)) {
      update("stt_model", sttModels[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.stt_provider]);

  useEffect(() => {
    if (ttsModels.length && !ttsModels.find((m) => m.value === form.tts_model)) {
      update("tts_model", ttsModels[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tts_provider]);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) {
      setFieldErrors({ name: "Agent name is required" });
      setTabErrors(["identity"]);
      setTab("identity");
      toast.error("Agent name is required");
      return;
    }
    setIsSubmitting(true);
    setFieldErrors({});
    setTabErrors([]);
    try {
      const saved = isEdit
        ? await agentService.update(agent!.id, form)
        : await agentService.create(form);
      toast.success(isEdit ? "Agent updated" : "Agent created");
      onSuccess(saved);
    } catch (err: unknown) {
      const e = err as {
        response?: {
          status?: number;
          data?: {
            detail?:
              | string
              | {
                  detail?: string;
                  errors?: Array<{ field: string; tab?: string; message: string }>;
                };
          };
        };
      };
      const status = e.response?.status;
      const data = e.response?.data;

      if (status === 422 && typeof data?.detail === "object") {
        const errors = data.detail.errors || [];
        const fieldErrs: Record<string, string> = {};
        const tabErrs: string[] = [];
        errors.forEach((er) => {
          fieldErrs[er.field] = er.message;
          if (er.tab && !tabErrs.includes(er.tab)) tabErrs.push(er.tab);
        });
        setFieldErrors(fieldErrs);
        setTabErrors(tabErrs);
        if (tabErrs.length > 0) setTab(tabErrs[0]);
        toast.error("Please fix the errors before saving");
      } else {
        const msg =
          typeof data?.detail === "string"
            ? data.detail
            : (data?.detail as { detail?: string })?.detail || "Failed to save agent";
        toast.error(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (optionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!options) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Failed to load agent options</p>
      </div>
    );
  }

  const ValueBadge = ({ value }: { value: string | number }) => (
    <Badge variant="secondary" className="ml-2 font-mono text-xs">
      {value}
    </Badge>
  );

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h4 className="text-sm font-semibold text-foreground mt-2">{children}</h4>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 flex flex-col">
        <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="w-full grid grid-cols-5 flex-shrink-0">
            {(["identity", "prompt", "voice", "behavior", "telephony"] as const).map((t) => (
              <TabsTrigger key={t} value={t} className="capitalize">
                {t}
                {tabErrors.includes(t) && (
                  <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-red-500" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto pr-2 mt-4">
            {/* TAB 1 — IDENTITY */}
            <TabsContent value="identity" className="space-y-4 mt-0">
              <div className="space-y-1.5">
                <Label>Agent name *</Label>
                <Input
                  value={form.name || ""}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Priya - FundMyCampus"
                  required
                  className={fieldErrors.name ? "border-red-500" : ""}
                />
                {fieldErrors.name && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => update("role", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {options.roles.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tone</Label>
                  <Select value={form.tone} onValueChange={(v) => update("tone", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {options.tones.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <Label>Agent is active</Label>
                <Switch
                  checked={!!form.is_active}
                  onCheckedChange={(v) => update("is_active", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Set as default agent</Label>
                <Switch
                  checked={!!form.is_default}
                  onCheckedChange={(v) => update("is_default", v)}
                />
              </div>
            </TabsContent>

            {/* TAB 2 — PROMPT */}
            <TabsContent value="prompt" className="space-y-4 mt-0">
              <div className="space-y-1.5">
                <Label>System prompt</Label>
                <Textarea
                  value={form.system_prompt || ""}
                  onChange={(e) => update("system_prompt", e.target.value)}
                  placeholder="You are Priya, a friendly female education loan specialist..."
                  className={`min-h-[250px] font-mono text-sm ${
                    fieldErrors.system_prompt ? "border-red-500" : ""
                  }`}
                />
                <p className="text-xs text-muted-foreground">
                  {(form.system_prompt || "").length.toLocaleString()} characters
                </p>
                {fieldErrors.system_prompt && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.system_prompt}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Welcome message</Label>
                <Input
                  value={form.welcome_message || ""}
                  onChange={(e) => update("welcome_message", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Variables you can use: {"{name}"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Final message (English)</Label>
                  <Input
                    value={form.final_message_en || ""}
                    onChange={(e) => update("final_message_en", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Final message (Hindi)</Label>
                  <Input
                    value={form.final_message_hi || ""}
                    onChange={(e) => update("final_message_hi", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Silence message (English)</Label>
                  <Input
                    value={form.silence_message_en || ""}
                    onChange={(e) => update("silence_message_en", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Silence message (Hindi)</Label>
                  <Input
                    value={form.silence_message_hi || ""}
                    onChange={(e) => update("silence_message_hi", e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 3 — VOICE */}
            <TabsContent value="voice" className="space-y-6 mt-0">
              {/* Intelligence */}
              <div className="space-y-4">
                <SectionTitle>Intelligence (LLM)</SectionTitle>
                <div className="space-y-1.5">
                  <Label>LLM Model</Label>
                  <Select value={form.llm_model} onValueChange={(v) => update("llm_model", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {options.llm_models.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center">
                    Temperature
                    <ValueBadge value={form.llm_temperature ?? 0.3} />
                  </Label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={form.llm_temperature ?? 0.3}
                    onChange={(e) => update("llm_temperature", parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-xs text-muted-foreground">Higher = more creative responses</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center">
                    Max tokens
                    <ValueBadge value={form.llm_max_tokens ?? 100} />
                  </Label>
                  <input
                    type="range"
                    min={50}
                    max={300}
                    step={10}
                    value={form.llm_max_tokens ?? 100}
                    onChange={(e) => update("llm_max_tokens", parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-xs text-muted-foreground">Lower = faster response</p>
                </div>
              </div>

              {/* Listening */}
              <div className="space-y-4 border-t pt-4">
                <SectionTitle>Listening (STT)</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>STT Provider</Label>
                    <Select value={form.stt_provider} onValueChange={(v) => update("stt_provider", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {options.stt_providers.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>STT Model</Label>
                    <Select value={form.stt_model} onValueChange={(v) => update("stt_model", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {sttModels.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Keywords</Label>
                  <Input
                    value={form.stt_keywords || ""}
                    onChange={(e) => update("stt_keywords", e.target.value)}
                    placeholder="FundMyCampus:100, loan:80"
                  />
                  <p className="text-xs text-muted-foreground">Boost recognition of specific words</p>
                </div>
              </div>

              {/* Speaking */}
              <div className="space-y-4 border-t pt-4">
                <SectionTitle>Speaking (TTS)</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>TTS Provider</Label>
                    <Select value={form.tts_provider} onValueChange={(v) => update("tts_provider", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {options.tts_providers.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>TTS Model</Label>
                    <Select value={form.tts_model} onValueChange={(v) => update("tts_model", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ttsModels.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <div className="inline-flex rounded-md border bg-muted p-0.5">
                    {(["female", "male"] as const).map((g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => update("tts_gender", g)}
                        className={`px-4 py-1.5 text-sm rounded capitalize transition-colors ${
                          form.tts_gender === g
                            ? "bg-background shadow-sm font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Voice</Label>
                  <Select value={form.tts_voice} onValueChange={(v) => update("tts_voice", v)}>
                    <SelectTrigger><SelectValue placeholder="Select voice" /></SelectTrigger>
                    <SelectContent>
                      {voiceList.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center">
                    Speed
                    <ValueBadge value={(form.tts_speed ?? 1.0).toFixed(2)} />
                  </Label>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.05}
                    value={form.tts_speed ?? 1.0}
                    onChange={(e) => update("tts_speed", parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-xs text-muted-foreground">1.0 = natural speed</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center">
                    Buffer size
                    <ValueBadge value={form.tts_buffer_size ?? 200} />
                  </Label>
                  <input
                    type="range"
                    min={50}
                    max={400}
                    step={10}
                    value={form.tts_buffer_size ?? 200}
                    onChange={(e) => update("tts_buffer_size", parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-xs text-muted-foreground">Higher = smoother but slower</p>
                </div>
              </div>

              {/* Dual TTS Voice */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">Dual TTS Voice</p>
                    <p className="text-xs text-gray-500">
                      Different voices for English and Hindi separately
                    </p>
                  </div>
                  <Switch
                    checked={dualTtsEnabled}
                    onCheckedChange={(v) => {
                      setDualTtsEnabled(v);
                      if (!v) {
                        setForm((prev) => ({
                          ...prev,
                          tts_provider_english: "",
                          tts_model_english: "",
                          tts_voice_english: "",
                          tts_provider_hindi: "",
                          tts_model_hindi: "",
                          tts_voice_hindi: "",
                        }));
                      }
                    }}
                  />
                </div>

                {dualTtsEnabled && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* English Voice */}
                      <div className="border rounded-lg p-3 space-y-3">
                        <p className="text-sm font-medium mb-2">English Voice</p>
                        <div className="space-y-1.5">
                          <Label>Provider</Label>
                          <Select
                            value={form.tts_provider_english || ""}
                            onValueChange={(v) => {
                              setForm((prev) => ({
                                ...prev,
                                tts_provider_english: v,
                                tts_model_english: TTS_MODELS_ENGLISH[v] || "",
                                tts_voice_english: "",
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              {(options.tts_providers_english || []).map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Model</Label>
                          <Select
                            value={form.tts_model_english || ""}
                            onValueChange={(v) => update("tts_model_english", v)}
                            disabled={!form.tts_provider_english}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                              {form.tts_provider_english &&
                                TTS_MODELS_ENGLISH[form.tts_provider_english] && (
                                  <SelectItem
                                    value={TTS_MODELS_ENGLISH[form.tts_provider_english]}
                                  >
                                    {TTS_MODELS_ENGLISH[form.tts_provider_english]}
                                  </SelectItem>
                                )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Voice</Label>
                          <Select
                            value={form.tts_voice_english || ""}
                            onValueChange={(v) => update("tts_voice_english", v)}
                            disabled={!form.tts_provider_english}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select voice" />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                (options.tts_voices_english &&
                                  form.tts_provider_english &&
                                  options.tts_voices_english[form.tts_provider_english]) ||
                                []
                              ).map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Hindi Voice */}
                      <div className="border rounded-lg p-3 space-y-3">
                        <p className="text-sm font-medium mb-2">Hindi Voice</p>
                        <div className="space-y-1.5">
                          <Label>Provider</Label>
                          <Select
                            value={form.tts_provider_hindi || ""}
                            onValueChange={(v) => {
                              setForm((prev) => ({
                                ...prev,
                                tts_provider_hindi: v,
                                tts_model_hindi: TTS_MODELS_HINDI[v] || "",
                                tts_voice_hindi: "",
                              }));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              {(options.tts_providers_hindi || []).map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Model</Label>
                          <Select
                            value={form.tts_model_hindi || ""}
                            onValueChange={(v) => update("tts_model_hindi", v)}
                            disabled={!form.tts_provider_hindi}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                              {form.tts_provider_hindi &&
                                TTS_MODELS_HINDI[form.tts_provider_hindi] && (
                                  <SelectItem
                                    value={TTS_MODELS_HINDI[form.tts_provider_hindi]}
                                  >
                                    {TTS_MODELS_HINDI[form.tts_provider_hindi]}
                                  </SelectItem>
                                )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Voice</Label>
                          <Select
                            value={form.tts_voice_hindi || ""}
                            onValueChange={(v) => update("tts_voice_hindi", v)}
                            disabled={!form.tts_provider_hindi}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select voice" />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                (options.tts_voices_hindi &&
                                  form.tts_provider_hindi &&
                                  options.tts_voices_hindi[form.tts_provider_hindi]) ||
                                []
                              ).map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      English messages → English Voice · Hindi messages → Hindi Voice ·
                      Auto-switches based on detected language
                    </p>
                  </>
                )}
              </div>

              {/* Language */}
              <div className="space-y-4 border-t pt-4">
                <SectionTitle>Language</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Primary language</Label>
                    <Select value={form.primary_language} onValueChange={(v) => update("primary_language", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {options.languages.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Secondary language</Label>
                    <Select value={form.secondary_language} onValueChange={(v) => update("secondary_language", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {options.secondary_languages.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto language switch</Label>
                    <p className="text-xs text-muted-foreground">Detect and switch language per message</p>
                  </div>
                  <Switch
                    checked={!!form.auto_language_switch}
                    onCheckedChange={(v) => update("auto_language_switch", v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Language style</Label>
                  <Select value={form.language_style} onValueChange={(v) => update("language_style", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {options.language_styles.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">How agent responds in language</p>
                </div>
              </div>

              {/* Live Pricing */}
              <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                <p className="text-sm font-medium">
                  Est. cost: ~${pricing.total.toFixed(3)}/min ≈ ₹{pricing.totalInr.toFixed(2)}/min
                </p>
                <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
                  <div className="bg-green-500" style={{ width: `${pricing.stt_pct}%` }} />
                  <div className="bg-orange-500" style={{ width: `${pricing.llm_pct}%` }} />
                  <div className="bg-slate-600" style={{ width: `${pricing.tts_pct}%` }} />
                  <div className="bg-blue-500" style={{ width: `${pricing.tel_pct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  ~₹{pricing.monthly.toLocaleString()}/month (1000 mins)
                </p>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  78% cheaper than Bolna ✓
                </Badge>
              </div>
            </TabsContent>

            {/* TAB 4 — BEHAVIOR */}
            <TabsContent value="behavior" className="space-y-6 mt-0">
              <div className="space-y-4">
                <SectionTitle>Response timing</SectionTitle>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Endpointing (ms)</Label>
                    <Input
                      type="number"
                      min={100}
                      max={500}
                      value={form.endpointing_ms ?? 250}
                      onChange={(e) => update("endpointing_ms", parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">How long to wait after user stops speaking</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Linear delay (ms)</Label>
                    <Input
                      type="number"
                      min={200}
                      max={800}
                      value={form.linear_delay_ms ?? 400}
                      onChange={(e) => update("linear_delay_ms", parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">How long to wait during mid-sentence pauses</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center">
                    Words before interrupt
                    <ValueBadge value={`${form.words_before_interrupt ?? 3} words`} />
                  </Label>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={1}
                    value={form.words_before_interrupt ?? 3}
                    onChange={(e) => update("words_before_interrupt", parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-xs text-muted-foreground">AI waits for this many words before stopping</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center">
                    Max response words
                    <ValueBadge value={form.max_response_words ?? 25} />
                  </Label>
                  <Input
                    type="number"
                    min={10}
                    max={60}
                    value={form.max_response_words ?? 25}
                    onChange={(e) => update("max_response_words", parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Keep short = faster and more natural</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Precise transcript</Label>
                    <p className="text-xs text-muted-foreground">Better accuracy, slight delay</p>
                  </div>
                  <Switch
                    checked={!!form.precise_transcript}
                    onCheckedChange={(v) => update("precise_transcript", v)}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <SectionTitle>Silence & detection</SectionTitle>
                <div className="space-y-1.5">
                  <Label className="flex items-center">
                    Silence detection (seconds)
                    <ValueBadge value={`${form.silence_detection_seconds ?? 9} seconds`} />
                  </Label>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={1}
                    value={form.silence_detection_seconds ?? 9}
                    onChange={(e) => update("silence_detection_seconds", parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Silence message (English)</Label>
                  <Input
                    value={form.silence_message_en || ""}
                    onChange={(e) => update("silence_message_en", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Silence message (Hindi)</Label>
                  <Input
                    value={form.silence_message_hi || ""}
                    onChange={(e) => update("silence_message_hi", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <SectionTitle>Audio quality</SectionTitle>
                <div className="flex items-center justify-between">
                  <Label>Noise cancellation</Label>
                  <Switch
                    checked={!!form.noise_cancellation}
                    onCheckedChange={(v) => update("noise_cancellation", v)}
                  />
                </div>
                {form.noise_cancellation && (
                  <div className="space-y-1.5">
                    <Label className="flex items-center">
                      Noise level
                      <ValueBadge value={form.noise_cancellation_level ?? 60} />
                    </Label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={form.noise_cancellation_level ?? 60}
                      onChange={(e) => update("noise_cancellation_level", parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Ambient noise</Label>
                  <Select value={form.ambient_noise} onValueChange={(v) => update("ambient_noise", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {options.ambient_noise_options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* TAB 5 — TELEPHONY */}
            <TabsContent value="telephony" className="space-y-6 mt-0">
              <div className="space-y-4">
                <SectionTitle>Call setup</SectionTitle>
                <div className="space-y-1.5">
                  <Label>Telephony provider</Label>
                  <Select value={form.telephony_provider} onValueChange={(v) => update("telephony_provider", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {options.telephony_providers.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Phone number</Label>
                  <Input
                    value={form.phone_number || ""}
                    onChange={(e) => update("phone_number", e.target.value)}
                    placeholder="+91 XXXXXXXXXX"
                  />
                  <p className="text-xs text-muted-foreground">Outbound calls will show this number</p>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <SectionTitle>Call limits</SectionTitle>
                <div className="space-y-1.5">
                  <Label>Max call duration (seconds)</Label>
                  <Input
                    type="number"
                    value={form.call_timeout_seconds ?? 600}
                    onChange={(e) => update("call_timeout_seconds", parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">Call auto-ends after this time (600 = 10 mins)</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center">
                    Hangup on silence (seconds)
                    <ValueBadge value={`${form.hangup_on_silence_seconds ?? 10} seconds`} />
                  </Label>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={form.hangup_on_silence_seconds ?? 10}
                    onChange={(e) => update("hangup_on_silence_seconds", parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Voicemail detection</Label>
                    <p className="text-xs text-muted-foreground">Automatically detect and skip voicemail</p>
                  </div>
                  <Switch
                    checked={!!form.voicemail_detection}
                    onCheckedChange={(v) => update("voicemail_detection", v)}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <SectionTitle>Time restrictions</SectionTitle>
                <div className="flex items-center justify-between">
                  <Label>Restrict calling hours</Label>
                  <Switch
                    checked={!!form.restrict_call_hours}
                    onCheckedChange={(v) => update("restrict_call_hours", v)}
                  />
                </div>
                {form.restrict_call_hours && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Start time</Label>
                        <Input
                          type="time"
                          value={form.call_start_time || "09:00"}
                          onChange={(e) => update("call_start_time", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>End time</Label>
                        <Input
                          type="time"
                          value={form.call_end_time || "19:00"}
                          onChange={(e) => update("call_end_time", e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Only make calls within these hours</p>
                  </>
                )}
              </div>

              <div className="space-y-4 border-t pt-4">
                <SectionTitle>Messages</SectionTitle>
                <div className="space-y-1.5">
                  <Label>Final message (English)</Label>
                  <Input
                    value={form.final_message_en || ""}
                    onChange={(e) => update("final_message_en", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Final message (Hindi)</Label>
                  <Input
                    value={form.final_message_hi || ""}
                    onChange={(e) => update("final_message_hi", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <SectionTitle>Webhook</SectionTitle>
                <div className="space-y-1.5">
                  <Label>Webhook URL</Label>
                  <Input
                    value={form.webhook_url || ""}
                    onChange={(e) => update("webhook_url", e.target.value)}
                    placeholder="https://your-backend.com/webhooks/calls"
                  />
                  <p className="text-xs text-muted-foreground">Receive call events (transcript, recording, etc.)</p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center gap-3 pt-4 border-t mt-4 flex-shrink-0">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Agent
        </Button>
      </div>
    </form>
  );
}

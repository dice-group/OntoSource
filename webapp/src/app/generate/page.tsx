"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createGenerateOntologyMutationOptions from "@/app/mutationOptions/createGenerateOntologyMutationOptions";
import { createGenerateJobStatusQueryOptions } from "@/app/queryOptions/createGenerateJobStatusQueryOptions";
import createSummaryAllQueryOptions from "@/app/queryOptions/createSummaryAllQueryOptions";
import { useSetSelectedOntology } from "@/app/store/ontology-store";
import { toast } from "sonner";
import ComboBox, { type ComboBoxOption } from "@/app/components/ComboBox";
import StepSection from "@/app/components/ui/StepSection";
import Button from "@/app/components/ui/Button";
import { Sparkles, ChevronDown, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

type OntologySummaryItem = { id: string; filename: string };

const API_PROVIDER_PRESETS: ComboBoxOption[] = [
  { value: "https://models.github.ai/inference", label: "GitHub Models", description: "Free inference via GitHub Models marketplace" },
  { value: "https://api.openai.com/v1", label: "OpenAI", description: "GPT-4o, o1, o3, etc." },
  { value: "https://api.anthropic.com/v1", label: "Anthropic", description: "Claude 4, Sonnet, Haiku, etc." },
  { value: "https://openrouter.ai/api/v1", label: "OpenRouter", description: "Aggregator — access 200+ models" },
  { value: "https://api.groq.com/openai/v1", label: "Groq", description: "Ultra-fast LLM inference" },
  { value: "https://api.together.xyz/v1", label: "Together AI", description: "Open-source & fine-tuned models" },
  { value: "https://api.fireworks.ai/inference/v1", label: "Fireworks AI", description: "Fast open-source model hosting" },
  { value: "https://api.deepseek.com/v1", label: "DeepSeek", description: "DeepSeek V3/R1 models" },
  { value: "http://localhost:11434/v1", label: "Ollama (local)", description: "Local Ollama instance" },
  { value: "http://localhost:1234/v1", label: "LM Studio (local)", description: "Local LM Studio instance" },
];

const DEFAULT_MODEL_PRESETS: ComboBoxOption[] = [
  { value: "gpt-4o", label: "GPT-4o", description: "OpenAI flagship" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", description: "Fast & cheap" },
  { value: "gpt-4.1", label: "GPT-4.1", description: "OpenAI latest" },
  { value: "o4-mini", label: "o4-mini", description: "OpenAI reasoning" },
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", description: "Anthropic" },
  { value: "deepseek-chat", label: "DeepSeek V3", description: "DeepSeek" },
  { value: "deepseek-reasoner", label: "DeepSeek R1", description: "DeepSeek reasoning" },
];

const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3B78B8]/20 focus:border-[#3B78B8] text-slate-900 placeholder-slate-400 text-sm transition-colors bg-white";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";
const checkboxCls = "rounded border-slate-300 text-[#3B78B8] focus:ring-[#3B78B8]";

export default function GeneratePage() {
  const queryClient = useQueryClient();
  const setSelectedOntology = useSetSelectedOntology();

  const [text, setText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("gpt-4o");
  const [apiBase, setApiBase] = useState("https://models.github.ai/inference");
  const [ontologyNamespace, setOntologyNamespace] = useState("http://example.com/ontogen#");
  const [filename, setFilename] = useState("generated_ontology.owl");
  const [ontologyType, setOntologyType] = useState<"domain" | "open">("domain");

  const [fetchedModels, setFetchedModels] = useState<ComboBoxOption[]>([]);
  const [modelsFetching, setModelsFetching] = useState(false);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchModels = useCallback(async (base: string, key: string) => {
    if (!base.trim() || !key.trim()) { setFetchedModels([]); return; }
    setModelsFetching(true);
    try {
      const params = new URLSearchParams({ api_base: base, api_key: key });
      const res = await fetch(`/api/models?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFetchedModels((data.models || []).map((m: string) => ({ value: m, label: m })));
    } catch { setFetchedModels([]); }
    finally { setModelsFetching(false); }
  }, []);

  useEffect(() => {
    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    fetchTimeoutRef.current = setTimeout(() => fetchModels(apiBase, apiKey), 600);
    return () => { if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current); };
  }, [apiBase, apiKey, fetchModels]);

  const modelOptions = fetchedModels.length > 0 ? fetchedModels : DEFAULT_MODEL_PRESETS;
  const [query, setQuery] = useState("");

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [domain, setDomain] = useState("");
  const [entityTypes, setEntityTypes] = useState("");
  const [generateTypes, setGenerateTypes] = useState(false);
  const [extractSplTriples, setExtractSplTriples] = useState(false);
  const [createClassHierarchy, setCreateClassHierarchy] = useState(false);
  const [entityClustering, setEntityClustering] = useState(true);
  const [useChunking, setUseChunking] = useState<"auto" | "enabled" | "disabled">("auto");
  const [useIncrementalMerging, setUseIncrementalMerging] = useState(false);
  const [factReassurance, setFactReassurance] = useState(true);
  const [temperature, setTemperature] = useState(0.1);
  const [seed, setSeed] = useState(42);
  const [cache, setCache] = useState(false);
  const [enableLogging, setEnableLogging] = useState(false);
  const [maxTokens, setMaxTokens] = useState(4000);

  const [showChunkingConfig, setShowChunkingConfig] = useState(false);
  const [chunkSize, setChunkSize] = useState<number | "">(3000);
  const [overlap, setOverlap] = useState<number | "">(200);
  const [chunkingStrategy, setChunkingStrategy] = useState("sentence");
  const [autoChunkThreshold, setAutoChunkThreshold] = useState<number | "">(4000);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: ontologies } = useQuery(createSummaryAllQueryOptions());
  const generateMutation = useMutation(createGenerateOntologyMutationOptions());

  const { data: jobStatus } = useQuery(
    createGenerateJobStatusQueryOptions(activeJobId || "", !!activeJobId)
  );

  useEffect(() => {
    if (!jobStatus) return;
    if (jobStatus.status === "completed") {
      if (jobStatus.ontology_id) {
        setSelectedOntology(jobStatus.ontology_id);
        queryClient.invalidateQueries({ queryKey: ["ontologies"] });
        toast.success(jobStatus.message || "Ontology generated successfully!");
      }
      setActiveJobId(null);
    } else if (jobStatus.status === "failed") {
      toast.error(jobStatus.error || "Failed to generate ontology");
      setActiveJobId(null);
    }
  }, [jobStatus, queryClient, setSelectedOntology]);

  const handleGenerate = async () => {
    if (!text.trim()) { toast.error("Please enter some text to generate an ontology from"); return; }
    if (!apiKey.trim()) { toast.error("Please provide an API key"); return; }

    const useChunkingValue = useChunking === "auto" ? null : useChunking === "enabled";

    try {
      const result = await generateMutation.mutateAsync({
        text, model_name: modelName, api_key: apiKey, api_base: apiBase,
        ontology_namespace: ontologyNamespace, filename, ontology_type: ontologyType,
        query: query.trim() || null, domain: domain.trim() || null,
        entity_types: entityTypes ? entityTypes.split(",").map((t) => t.trim()) : null,
        generate_types: generateTypes, extract_spl_triples: extractSplTriples,
        create_class_hierarchy: createClassHierarchy, entity_clustering: entityClustering,
        use_chunking: useChunkingValue, use_incremental_merging: useIncrementalMerging,
        fact_reassurance: factReassurance, temperature, seed, cache,
        enable_logging: enableLogging, max_tokens: maxTokens,
        chunk_size: showChunkingConfig && chunkSize !== "" ? Number(chunkSize) : null,
        overlap: showChunkingConfig && overlap !== "" ? Number(overlap) : null,
        chunking_strategy: showChunkingConfig ? chunkingStrategy : null,
        auto_chunk_threshold: showChunkingConfig && autoChunkThreshold !== "" ? Number(autoChunkThreshold) : null,
      });
      setActiveJobId(result.job_id);
      toast.info("Ontology generation started…");
    } catch (error) {
      console.error("Failed to start generation:", error);
    }
  };

  const isRunning = generateMutation.isPending || !!activeJobId;
  const isProcessing = activeJobId && (jobStatus?.status === "pending" || jobStatus?.status === "processing");

  return (
    <div className="bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[#3B78B8] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Generate Ontology</h1>
          </div>
          <p className="text-sm text-slate-500">
            Use AI to automatically generate ontologies from natural language descriptions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: config */}
          <div className="lg:col-span-2 space-y-4">

            {/* Step 1: Input text */}
            <StepSection step={1} title="Input Text" description="Describe the domain concepts and relationships">
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Text to analyze</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder='E.g. "A family consists of parents and children. Parents have children. A person can be male or female."'
                    className={`${inputCls} font-mono resize-y`}
                    rows={7}
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Custom prompt{" "}
                    <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Additional instructions, e.g. 'Focus on hierarchical relationships only'"
                    className={`${inputCls} resize-none`}
                    rows={2}
                  />
                </div>
              </div>
            </StepSection>

            {/* Step 2: API configuration */}
            <StepSection step={2} title="API Configuration" description="Connect to your preferred LLM provider">
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>
                    API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ComboBox
                    id="api-base-select"
                    label="API Provider"
                    value={apiBase}
                    onChange={setApiBase}
                    options={API_PROVIDER_PRESETS}
                    placeholder="Select provider or paste URL…"
                    hint="Pick a known provider or enter any OpenAI-compatible endpoint"
                  />
                  <ComboBox
                    id="model-select"
                    label="Model"
                    value={modelName}
                    onChange={setModelName}
                    options={modelOptions}
                    loading={modelsFetching}
                    placeholder="Select or type model name…"
                    hint={
                      fetchedModels.length > 0
                        ? `${fetchedModels.length} models available`
                        : apiKey
                          ? "Enter API key & base to auto-fetch models"
                          : "Showing common presets"
                    }
                  />
                </div>
              </div>
            </StepSection>

            {/* Step 3: Ontology configuration */}
            <StepSection step={3} title="Ontology Configuration" description="Define the output ontology properties">
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Extraction Mode</label>
                  <div className="flex rounded-lg overflow-hidden border border-slate-200">
                    {(["domain", "open"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setOntologyType(type)}
                        className={[
                          "flex-1 py-2 text-sm font-medium transition-colors capitalize",
                          ontologyType === type
                            ? "bg-[#3B78B8] text-white"
                            : "bg-white text-slate-600 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {type === "domain" ? "Domain-specific" : "Open-world"}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {ontologyType === "domain"
                      ? "Extracts a focused, domain-specific ontology."
                      : "Extracts a more general, open-world ontology."}
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Ontology Namespace</label>
                  <input type="text" value={ontologyNamespace} onChange={(e) => setOntologyNamespace(e.target.value)} placeholder="http://example.com/ontogen#" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Output Filename</label>
                  <input type="text" value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="generated_ontology.owl" className={inputCls} />
                </div>
              </div>
            </StepSection>

            {/* Advanced Options */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="w-full flex items-center justify-between px-6 py-4 text-left"
              >
                <span className="text-sm font-semibold text-slate-900">Advanced Options</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showAdvancedOptions ? "rotate-180" : ""}`}
                />
              </button>

              {showAdvancedOptions && (
                <div className="px-6 pb-6 border-t border-slate-100 pt-5 space-y-6">
                  {/* Extraction */}
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Extraction</p>

                    {ontologyType === "domain" && (
                      <div>
                        <label className={labelCls}>Domain <span className="font-normal text-slate-400">(optional)</span></label>
                        <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Auto-detected if left empty" className={inputCls} />
                      </div>
                    )}

                    <div>
                      <label className={labelCls}>Entity Types <span className="font-normal text-slate-400">(comma-separated)</span></label>
                      <input type="text" value={entityTypes} onChange={(e) => setEntityTypes(e.target.value)} placeholder="Person, Organization, Event" className={inputCls} />
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { checked: generateTypes, setter: setGenerateTypes, label: "Generate Types" },
                        { checked: extractSplTriples, setter: setExtractSplTriples, label: "Extract SPL Triples" },
                        { checked: createClassHierarchy, setter: setCreateClassHierarchy, label: "Create Class Hierarchy" },
                        { checked: factReassurance, setter: setFactReassurance, label: "Fact Reassurance (coherence check)" },
                        ...(ontologyType === "open" ? [{ checked: entityClustering, setter: setEntityClustering, label: "Entity Clustering" }] : []),
                      ].map(({ checked, setter, label }) => (
                        <label key={label} className="flex items-center gap-2.5 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={(e) => setter(e.target.checked)} className={checkboxCls} />
                          <span className="text-sm text-slate-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Chunking */}
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chunking</p>
                    <div>
                      <label className={labelCls}>Chunking Mode</label>
                      <select value={useChunking} onChange={(e) => setUseChunking(e.target.value as "auto" | "enabled" | "disabled")} className={inputCls}>
                        <option value="auto">Auto (based on text size)</option>
                        <option value="enabled">Always enabled</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={useIncrementalMerging} onChange={(e) => setUseIncrementalMerging(e.target.checked)} className={checkboxCls} />
                      <span className="text-sm text-slate-700">Incremental Merging</span>
                    </label>

                    <button type="button" onClick={() => setShowChunkingConfig(!showChunkingConfig)} className="text-xs text-[#3B78B8] hover:text-[#2A5988] flex items-center gap-1 font-medium">
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showChunkingConfig ? "rotate-180" : ""}`} />
                      {showChunkingConfig ? "Hide" : "Show"} chunking parameters
                    </button>

                    {showChunkingConfig && (
                      <div className="space-y-4 pl-4 border-l-2 border-[#3B78B8]/20">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Chunk Size (chars)</label>
                            <input type="number" min="100" value={chunkSize} onChange={(e) => setChunkSize(e.target.value === "" ? "" : parseInt(e.target.value))} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Overlap (chars)</label>
                            <input type="number" min="0" value={overlap} onChange={(e) => setOverlap(e.target.value === "" ? "" : parseInt(e.target.value))} className={inputCls} />
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Chunking Strategy</label>
                          <select value={chunkingStrategy} onChange={(e) => setChunkingStrategy(e.target.value)} className={inputCls}>
                            <option value="sentence">Sentence</option>
                            <option value="paragraph">Paragraph</option>
                            <option value="fixed">Fixed</option>
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Auto-chunk Threshold (chars)</label>
                          <input type="number" min="100" value={autoChunkThreshold} onChange={(e) => setAutoChunkThreshold(e.target.value === "" ? "" : parseInt(e.target.value))} className={inputCls} />
                          <p className="mt-1 text-xs text-slate-500">Text longer than this triggers automatic chunking in auto mode.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Model settings */}
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Model Parameters</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={labelCls}>Temperature</label>
                        <input type="number" step="0.1" min="0" max="2" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Seed</label>
                        <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value))} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Max Tokens</label>
                        <input type="number" min="1" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))} className={inputCls} />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { checked: cache, setter: setCache, label: "Enable Response Cache" },
                        { checked: enableLogging, setter: setEnableLogging, label: "Enable Logging" },
                      ].map(({ checked, setter, label }) => (
                        <label key={label} className="flex items-center gap-2.5 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={(e) => setter(e.target.checked)} className={checkboxCls} />
                          <span className="text-sm text-slate-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isRunning || !text.trim() || !apiKey.trim()}
                loading={isRunning}
                size="lg"
                fullWidth
                icon={!isRunning ? <Sparkles className="w-4 h-4" /> : undefined}
              >
                {isRunning ? (isProcessing ? "Generating…" : "Starting…") : "Generate Ontology"}
              </Button>
              <Button
                onClick={() => { setText(""); setEntityTypes(""); setQuery(""); }}
                disabled={isRunning}
                variant="secondary"
                size="lg"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Right column: status */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-8">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">Status</h2>
              </div>
              <div className="p-5">
                {!activeJobId && !jobStatus ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">Configure and start generation to see status</p>
                  </div>
                ) : isProcessing ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-[#3B78B8] mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700 mb-1 capitalize">{jobStatus?.status || "Starting"}…</p>
                    <p className="text-xs text-slate-500">
                      {jobStatus?.status === "processing"
                        ? "Analyzing text and generating ontology. This may take a while."
                        : "Initializing generation process…"}
                    </p>
                    <div className="mt-4 bg-[#EBF3FC] rounded-xl p-3">
                      <p className="text-xs text-[#2A5988] font-mono break-all">{activeJobId}</p>
                    </div>
                  </div>
                ) : jobStatus?.status === "completed" ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <p className="text-sm font-semibold text-emerald-800">Generation Complete!</p>
                      </div>
                      <p className="text-xs text-emerald-700">{jobStatus.message}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      {[
                        { label: "Filename", value: jobStatus.filename },
                        { label: "ID", value: jobStatus.ontology_id, mono: true },
                        { label: "IRI", value: jobStatus.ontology_iri, mono: true },
                      ].map(({ label, value, mono }) => (
                        <div key={label}>
                          <p className="text-xs font-medium text-slate-500">{label}</p>
                          <p className={["text-xs text-slate-800 break-all", mono ? "font-mono" : "font-medium"].join(" ")}>{value}</p>
                        </div>
                      ))}
                    </div>
                    <Button
                      fullWidth
                      onClick={() => {
                        if (jobStatus.ontology_id) {
                          setSelectedOntology(jobStatus.ontology_id);
                          window.location.href = "/";
                        }
                      }}
                      icon={<ArrowRight className="w-4 h-4" />}
                      iconPosition="right"
                    >
                      View in Visualizer
                    </Button>
                  </div>
                ) : jobStatus?.status === "failed" ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <p className="text-sm font-semibold text-red-800">Generation Failed</p>
                    </div>
                    <p className="text-xs text-red-700">{jobStatus.error}</p>
                  </div>
                ) : null}

                {ontologies && ontologies.summary.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-2">
                      Recent Ontologies ({ontologies.summary.length})
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {ontologies.summary.slice(0, 5).map((ont: OntologySummaryItem) => (
                        <div key={ont.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                          <p className="text-xs font-semibold text-slate-800 truncate">{ont.filename}</p>
                          <p className="text-xs text-slate-400 font-mono truncate">{ont.id.slice(0, 24)}…</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

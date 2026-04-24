"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createSummaryAllQueryOptions from "@/app/queryOptions/createSummaryAllQueryOptions";
import createOntologyEntitiesQueryOptions from "@/app/queryOptions/createOntologyEntitiesQueryOptions";
import { createInstancesQueryOptions } from "@/app/queryOptions/createInstancesQueryOptions";
import { createNeuralOntologyListQueryOptions } from "@/app/queryOptions/createNeuralOntologyListQueryOptions";
import { createNeuralInstancesQueryOptions } from "@/app/queryOptions/createNeuralInstancesQueryOptions";
import createNeuralOntologyMutationOptions from "@/app/mutationOptions/createNeuralOntologyMutationOptions";
import { createNeuralJobStatusQueryOptions } from "@/app/queryOptions/createNeuralJobStatusQueryOptions";
import { useSelectedOntologyId, useSetSelectedOntology } from "@/app/store/ontology-store";
import { toast } from "sonner";
import Button from "@/app/components/ui/Button";
import StepSection from "@/app/components/ui/StepSection";
import Badge from "@/app/components/ui/Badge";
import { Brain, Play, AlertCircle } from "lucide-react";

const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3B78B8]/20 focus:border-[#3B78B8] text-slate-900 placeholder-slate-400 text-sm transition-colors bg-white";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";
const checkboxCls = "rounded border-slate-300 text-[#3B78B8] focus:ring-[#3B78B8]";

const TOGGLE_BASE = "flex-1 py-2 text-sm font-medium transition-colors";
const TOGGLE_ACTIVE = "bg-[#3B78B8] text-white";
const TOGGLE_INACTIVE = "bg-white text-slate-600 hover:bg-slate-50";

export default function PredictPage() {
  const queryClient = useQueryClient();

  const selectedOntology = useSelectedOntologyId() || "";
  const setSelectedOntology = useSetSelectedOntology();

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [expressionSyntax, setExpressionSyntax] = useState<"iri" | "dl" | "manchester">("iri");
  const [customExpression, setCustomExpression] = useState<string>("");
  const [useCustomExpression, setUseCustomExpression] = useState(false);

  const [reasonerType, setReasonerType] = useState<"structural" | "sync" | "neural">("structural");
  const [propertyCache, setPropertyCache] = useState(true);
  const [negationDefault, setNegationDefault] = useState(true);
  const [subProperties, setSubProperties] = useState(false);
  const [syncReasonerName, setSyncReasonerName] = useState<"HermiT" | "Pellet" | "ELK" | "JFact" | "Openllet" | "Structural">("HermiT");

  const [selectedNeuralOntology, setSelectedNeuralOntology] = useState<string>("");
  const [showNeuralCreate, setShowNeuralCreate] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [shouldPredict, setShouldPredict] = useState(false);

  const { data: ontologies } = useQuery(createSummaryAllQueryOptions());
  const { data: entities, isLoading: entitiesLoading } = useQuery(createOntologyEntitiesQueryOptions(selectedOntology));
  const { data: neuralOntologies } = useQuery(createNeuralOntologyListQueryOptions());
  const createNeuralOntology = useMutation(createNeuralOntologyMutationOptions());

  const { data: jobStatus } = useQuery(createNeuralJobStatusQueryOptions(activeJobId || "", !!activeJobId));

  useEffect(() => {
    if (!jobStatus) return;
    if (jobStatus.status === "completed") {
      if (jobStatus.neural_ontology_id) {
        setSelectedNeuralOntology(jobStatus.neural_ontology_id);
        queryClient.invalidateQueries({ queryKey: ["neural-ontologies"] });
        toast.success(jobStatus.message || "Neural ontology created successfully!");
      }
      setActiveJobId(null);
      setShowNeuralCreate(false);
    } else if (jobStatus.status === "failed") {
      toast.error(jobStatus.error || "Failed to create neural ontology");
      setActiveJobId(null);
      setShowNeuralCreate(false);
    }
  }, [jobStatus, queryClient]);

  const activeExpression = useCustomExpression ? customExpression : selectedClass;

  const { data: structuralResults, isLoading: structuralLoading, error: structuralError } = useQuery(
    createInstancesQueryOptions(selectedOntology, { class_expression: activeExpression, syntax: expressionSyntax, reasoner_type: "structural", property_cache: propertyCache, negation_default: negationDefault, sub_properties: subProperties }, shouldPredict && reasonerType === "structural" && !!activeExpression)
  );
  const { data: syncResults, isLoading: syncLoading, error: syncError } = useQuery(
    createInstancesQueryOptions(selectedOntology, { class_expression: activeExpression, syntax: expressionSyntax, reasoner_type: "sync", sync_reasoner_name: syncReasonerName }, shouldPredict && reasonerType === "sync" && !!activeExpression)
  );
  const { data: neuralResults, isLoading: neuralLoading, error: neuralError } = useQuery(
    createNeuralInstancesQueryOptions(selectedNeuralOntology, { class_expression: activeExpression, syntax: expressionSyntax }, shouldPredict && reasonerType === "neural" && !!selectedNeuralOntology && !!activeExpression)
  );

  const handleCreateNeuralOntology = async () => {
    if (!selectedOntology) return;
    try {
      const result = await createNeuralOntology.mutateAsync({ ontology_id: selectedOntology, retrain: true });
      setActiveJobId(result.job_id);
    } catch (error) {
      console.error("Failed to create neural ontology:", error);
    }
  };

  const handlePredict = () => {
    const expression = useCustomExpression ? customExpression : selectedClass;
    if (!expression) { alert("Please select or enter a class expression"); return; }
    if (reasonerType === "neural" && !selectedNeuralOntology) { alert("Please create or select a neural ontology"); return; }
    setShouldPredict(true);
  };

  const results = reasonerType === "neural" ? neuralResults : reasonerType === "sync" ? syncResults : structuralResults;
  const isLoading = reasonerType === "neural" ? neuralLoading : reasonerType === "sync" ? syncLoading : structuralLoading;
  const error = reasonerType === "neural" ? neuralError : reasonerType === "sync" ? syncError : structuralError;

  return (
    <div className="bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[#3B78B8] flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Instance Prediction</h1>
          </div>
          <p className="text-sm text-slate-500">
            Use ontology reasoners to predict instances of class expressions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: configuration */}
          <div className="lg:col-span-2 space-y-4">

            {/* Step 1: Select Ontology */}
            <StepSection step={1} title="Select Ontology">
              <select
                value={selectedOntology}
                onChange={(e) => { setSelectedOntology(e.target.value || null); setSelectedClass(""); setShouldPredict(false); }}
                className={inputCls}
              >
                <option value="">Select an ontology…</option>
                {ontologies?.summary.map((ont) => (
                  <option key={ont.id} value={ont.id}>{ont.filename}</option>
                ))}
              </select>
            </StepSection>

            {/* Step 2: Class Expression */}
            {selectedOntology && (
              <StepSection step={2} title="Build Class Expression">
                {entitiesLoading ? (
                  <div className="flex items-center gap-2 text-slate-500 text-sm py-3">
                    <div className="animate-spin h-4 w-4 rounded-full border-2 border-slate-200 border-t-[#3B78B8]" />
                    Loading classes…
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Mode toggle */}
                    <div>
                      <label className={labelCls}>Input Mode</label>
                      <div className="flex rounded-lg overflow-hidden border border-slate-200">
                        <button onClick={() => { setUseCustomExpression(false); setExpressionSyntax("iri"); setShouldPredict(false); }} className={[TOGGLE_BASE, !useCustomExpression ? TOGGLE_ACTIVE : TOGGLE_INACTIVE].join(" ")}>
                          Select from Classes
                        </button>
                        <button onClick={() => { setUseCustomExpression(true); setShouldPredict(false); }} className={[TOGGLE_BASE, useCustomExpression ? TOGGLE_ACTIVE : TOGGLE_INACTIVE].join(" ")}>
                          Custom Expression
                        </button>
                      </div>
                    </div>

                    {/* Syntax (custom only) */}
                    {useCustomExpression && (
                      <div>
                        <label className={labelCls}>Expression Syntax</label>
                        <div className="flex rounded-lg overflow-hidden border border-slate-200">
                          {(["iri", "dl", "manchester"] as const).map((syn) => (
                            <button key={syn} onClick={() => { setExpressionSyntax(syn); setShouldPredict(false); }} className={[TOGGLE_BASE, expressionSyntax === syn ? "bg-emerald-600 text-white" : TOGGLE_INACTIVE].join(" ")}>
                              {syn.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 text-xs text-slate-500 space-y-0.5 bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                          <p>· <strong>IRI:</strong> http://example.com/family#Person</p>
                          <p>· <strong>DL:</strong> ∃ hasChild.male</p>
                          <p>· <strong>Manchester:</strong> female and (hasChild max 2 person)</p>
                        </div>
                      </div>
                    )}

                    {/* Class select or custom input */}
                    {!useCustomExpression ? (
                      <div>
                        <label className={labelCls}>Class</label>
                        <select value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setShouldPredict(false); }} className={inputCls}>
                          <option value="">Select a class…</option>
                          {entities?.classes.map((cls) => (
                            <option key={cls.iri} value={cls.iri}>{cls.name} ({cls.iri})</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Insert class chips */}
                        {entities?.classes && entities.classes.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1.5">Insert class:</p>
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                              {entities.classes.map((cls) => (
                                <button key={cls.iri} type="button" onClick={() => setCustomExpression((prev) => prev + (expressionSyntax === "iri" ? cls.iri : cls.name) + " ")} className="px-2 py-0.5 text-xs bg-[#EBF3FC] hover:bg-[#d6e8f5] text-[#2A5988] rounded-md border border-[#B8D4EE] font-medium transition-colors" title={cls.iri}>
                                  {cls.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Object properties */}
                        {entities?.object_properties && entities.object_properties.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1.5">Insert object property:</p>
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                              {entities.object_properties.map((prop) => (
                                <button key={prop.iri} type="button" onClick={() => setCustomExpression((prev) => prev + (expressionSyntax === "iri" ? prop.iri : prop.name) + " ")} className="px-2 py-0.5 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-md border border-amber-200 font-medium transition-colors" title={prop.iri}>
                                  {prop.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Data properties */}
                        {entities?.data_properties && entities.data_properties.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1.5">Insert data property:</p>
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
                              {entities.data_properties.map((prop) => (
                                <button key={prop.iri} type="button" onClick={() => setCustomExpression((prev) => prev + (expressionSyntax === "iri" ? prop.iri : prop.name) + " ")} className="px-2 py-0.5 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-md border border-orange-200 font-medium transition-colors" title={prop.iri}>
                                  {prop.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* DL operators */}
                        {expressionSyntax === "dl" && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1.5">Operators:</p>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { symbol: "∃", label: "exists (∃)" }, { symbol: "∀", label: "forall (∀)" },
                                { symbol: "⊓", label: "and (⊓)" }, { symbol: "⊔", label: "or (⊔)" },
                                { symbol: "¬", label: "not (¬)" }, { symbol: "⊑", label: "subclass (⊑)" },
                                { symbol: "⊤", label: "top (⊤)" }, { symbol: "⊥", label: "bottom (⊥)" },
                                { symbol: ".", label: "role filler separator" },
                              ].map((op) => (
                                <button key={op.symbol} type="button" onClick={() => setCustomExpression((prev) => prev + op.symbol + " ")} className="px-2 py-0.5 text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-md border border-violet-200 transition-colors font-mono" title={op.label}>
                                  {op.symbol}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Manchester operators */}
                        {expressionSyntax === "manchester" && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1.5">Operators:</p>
                            <div className="flex flex-wrap gap-1">
                              {["and","or","not","some","only","min","max","exactly","value","(",")"].map((text) => (
                                <button key={text} type="button" onClick={() => setCustomExpression((prev) => prev + text + " ")} className="px-2 py-0.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 font-medium transition-colors">
                                  {text}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Textarea */}
                        <div className="relative">
                          <textarea
                            value={customExpression}
                            onChange={(e) => { setCustomExpression(e.target.value); setShouldPredict(false); }}
                            placeholder={
                              expressionSyntax === "iri" ? "e.g., http://example.com/family#Person" :
                              expressionSyntax === "dl" ? "e.g., ∃ hasChild.male" :
                              "e.g., female and (hasChild max 2 person)"
                            }
                            className={`${inputCls} font-mono resize-none`}
                            rows={4}
                          />
                          {customExpression && (
                            <button type="button" onClick={() => { setCustomExpression(""); setShouldPredict(false); }} className="absolute top-2 right-2 px-2 py-0.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-md border border-red-200 transition-colors">
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Active expression preview */}
                    {(selectedClass || customExpression) && (
                      <div className="bg-[#EBF3FC] border border-[#B8D4EE] rounded-xl p-3">
                        <p className="text-xs font-medium text-[#2A5988] mb-1">
                          Active Expression {useCustomExpression && `· ${expressionSyntax.toUpperCase()}`}
                        </p>
                        <code className="text-xs text-slate-800 break-all font-mono">{useCustomExpression ? customExpression : selectedClass}</code>
                      </div>
                    )}
                  </div>
                )}
              </StepSection>
            )}

            {/* Step 3: Reasoner */}
            {(selectedClass || customExpression) && (
              <StepSection step={3} title="Configure Reasoner">
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Reasoner Type</label>
                    <div className="flex rounded-lg overflow-hidden border border-slate-200">
                      {(["structural", "sync", "neural"] as const).map((type) => (
                        <button key={type} onClick={() => { setReasonerType(type); setShouldPredict(false); }} className={[TOGGLE_BASE, reasonerType === type ? TOGGLE_ACTIVE : TOGGLE_INACTIVE, "capitalize"].join(" ")}>
                          {type === "neural" ? "Neural (EBR)" : type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Structural options */}
                  {reasonerType === "structural" && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Options</p>
                      {[
                        { checked: propertyCache, setter: setPropertyCache, label: "Property Cache (faster reasoning)" },
                        { checked: negationDefault, setter: setNegationDefault, label: "Negation Default (missing facts = false)" },
                        { checked: subProperties, setter: setSubProperties, label: "Consider Sub-properties" },
                      ].map(({ checked, setter, label }) => (
                        <label key={label} className="flex items-center gap-2.5 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={(e) => setter(e.target.checked)} className={checkboxCls} />
                          <span className="text-sm text-slate-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Sync options */}
                  {reasonerType === "sync" && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Reasoner Engine</p>
                      <select value={syncReasonerName} onChange={(e) => setSyncReasonerName(e.target.value as "HermiT" | "Pellet" | "ELK" | "JFact" | "Openllet" | "Structural")} className={inputCls}>
                        {["HermiT", "Pellet", "ELK", "JFact", "Openllet", "Structural"].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Neural options */}
                  {reasonerType === "neural" && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Neural Ontology</p>

                      {neuralOntologies && neuralOntologies.neural_ontologies.length > 0 ? (
                        <select value={selectedNeuralOntology} onChange={(e) => setSelectedNeuralOntology(e.target.value)} className={inputCls}>
                          <option value="">Select neural ontology…</option>
                          {neuralOntologies.neural_ontologies
                            .filter((no) => no.ontology_id === selectedOntology)
                            .map((no) => (
                              <option key={no.neural_ontology_id} value={no.neural_ontology_id}>{no.neural_ontology_id}</option>
                            ))}
                        </select>
                      ) : (
                        <p className="text-sm text-slate-500">No neural ontologies available.</p>
                      )}

                      <button onClick={() => setShowNeuralCreate(!showNeuralCreate)} className="text-xs text-[#3B78B8] hover:text-[#2A5988] font-medium flex items-center gap-1">
                        + Create New Neural Ontology
                      </button>

                      {showNeuralCreate && (
                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                          <p className="text-xs text-slate-600">
                            Creates and trains a new neural ontology. Training may take several minutes.
                          </p>
                          {activeJobId && jobStatus && (
                            <div className="bg-[#EBF3FC] border border-[#B8D4EE] rounded-lg p-3 flex items-center gap-2">
                              {(jobStatus.status === "pending" || jobStatus.status === "processing") && (
                                <div className="animate-spin h-3.5 w-3.5 rounded-full border-2 border-[#B8D4EE] border-t-[#3B78B8]" />
                              )}
                              <p className="text-xs font-medium text-[#2A5988] capitalize">
                                {jobStatus.status}
                                {jobStatus.status === "processing" && " — training in progress…"}
                              </p>
                            </div>
                          )}
                          <Button
                            onClick={handleCreateNeuralOntology}
                            loading={createNeuralOntology.isPending || !!activeJobId}
                            variant="success"
                            size="sm"
                            fullWidth
                          >
                            {activeJobId
                              ? `${jobStatus?.status === "processing" ? "Training" : "Creating"}…`
                              : "Create & Train Neural Ontology"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={handlePredict}
                    size="lg"
                    fullWidth
                    icon={<Play className="w-4 h-4" />}
                  >
                    Predict Instances
                  </Button>
                </div>
              </StepSection>
            )}
          </div>

          {/* Right: results */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-8">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Results</h2>
                {results && !isLoading && (
                  <Badge variant="primary" dot>
                    {results.individuals.length} found
                  </Badge>
                )}
              </div>
              <div className="p-5">
                {!shouldPredict ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <Brain className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">Configure and run prediction to see results</p>
                  </div>
                ) : isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-[#3B78B8] mx-auto mb-3" />
                    <p className="text-sm text-slate-600 font-medium">Running reasoner…</p>
                  </div>
                ) : error ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <p className="text-sm font-semibold text-red-800">Error</p>
                    </div>
                    <p className="text-xs text-red-700 break-words">{String(error)}</p>
                  </div>
                ) : results ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Reasoner:</span>
                      <Badge variant="neutral">
                        {"reasoner_type" in results ? String(results.reasoner_type) : reasonerType}
                      </Badge>
                    </div>

                    {results.individuals.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-sm">No instances found</div>
                    ) : (
                      <div className="space-y-1.5 max-h-96 overflow-y-auto">
                        {results.individuals.map((ind) => (
                          <div key={ind.iri} className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:bg-[#EBF3FC] hover:border-[#B8D4EE] transition-colors">
                            <p className="text-xs font-semibold text-slate-800 mb-0.5">{ind.name}</p>
                            <p className="text-xs text-slate-400 font-mono break-all">{ind.iri}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

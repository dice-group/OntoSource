"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createGenerateOntologyMutationOptions from "@/app/mutationOptions/createGenerateOntologyMutationOptions";
import { createGenerateJobStatusQueryOptions } from "@/app/queryOptions/createGenerateJobStatusQueryOptions";
import createSummaryAllQueryOptions from "@/app/queryOptions/createSummaryAllQueryOptions";
import { useSetSelectedOntology } from "@/app/store/ontology-store";
import { toast } from "sonner";

export default function GeneratePage() {
  const queryClient = useQueryClient();
  const setSelectedOntology = useSetSelectedOntology();

  // State for form inputs
  const [text, setText] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("gpt-5");
  const [apiBase, setApiBase] = useState("https://api.openai.com/v1");
  const [ontologyNamespace, setOntologyNamespace] = useState("http://example.com/ontogen#");
  const [filename, setFilename] = useState("generated_ontology.owl");
  
  // Advanced options
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [entityTypes, setEntityTypes] = useState("");
  const [generateTypes, setGenerateTypes] = useState(false);
  const [extractSplTriples, setExtractSplTriples] = useState(false);
  const [createClassHierarchy, setCreateClassHierarchy] = useState(false);
  const [temperature, setTemperature] = useState(0.1);
  const [seed, setSeed] = useState(42);
  const [cache, setCache] = useState(false);
  const [cacheInMemory, setCacheInMemory] = useState(false);
  const [enableLogging, setEnableLogging] = useState(false);
  
  // Job tracking
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // Fetch existing ontologies
  const { data: ontologies } = useQuery(createSummaryAllQueryOptions());

  // Generate mutation
  const generateMutation = useMutation(createGenerateOntologyMutationOptions());

  // Poll job status when we have an active job
  const { data: jobStatus } = useQuery(
    createGenerateJobStatusQueryOptions(activeJobId || "", !!activeJobId)
  );

  // Handle job completion
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
    if (!text.trim()) {
      toast.error("Please enter some text to generate an ontology from");
      return;
    }

    if (!apiKey.trim()) {
      toast.error("Please provide an API key");
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        text,
        model_name: modelName,
        api_key: apiKey,
        api_base: apiBase,
        ontology_namespace: ontologyNamespace,
        filename,
        entity_types: entityTypes ? entityTypes.split(",").map(t => t.trim()) : null,
        generate_types: generateTypes,
        extract_spl_triples: extractSplTriples,
        create_class_hierarchy: createClassHierarchy,
        temperature,
        seed,
        cache,
        cache_in_memory: cacheInMemory,
        enable_logging: enableLogging,
      });

      // Store job ID to start polling
      setActiveJobId(result.job_id);
      toast.info("Ontology generation started...");
    } catch (error) {
      // Error already handled by mutation's onError
      console.error("Failed to start generation:", error);
    }
  };

  const clearForm = () => {
    setText("");
    setEntityTypes("");
  };

  return (
    <div className="bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Generate Ontology from Text</h1>
          <p className="text-gray-600">
            Use AI to automatically generate ontologies from natural language descriptions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Input Text */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                1. Input Text
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Text to analyze:
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter natural language text describing concepts, relationships, and entities..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-gray-900 placeholder-gray-500"
                    rows={8}
                  />
                  <p className="mt-2 text-xs text-gray-600">
                    Example: "A family consists of parents and children. Parents have children. A person can be male or female."
                  </p>
                </div>
              </div>
            </div>

            {/* API Configuration */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                2. API Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model:
                    </label>
                    <input
                      type="text"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Base:
                    </label>
                    <input
                      type="text"
                      value={apiBase}
                      onChange={(e) => setApiBase(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ontology Configuration */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                3. Ontology Configuration
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ontology Namespace:
                  </label>
                  <input
                    type="text"
                    value={ontologyNamespace}
                    onChange={(e) => setOntologyNamespace(e.target.value)}
                    placeholder="http://example.com/ontogen#"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filename:
                  </label>
                  <input
                    type="text"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder="generated_ontology.owl"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="w-full flex items-center justify-between text-xl font-semibold text-gray-800 mb-4"
              >
                <span>Advanced Options</span>
                <svg
                  className={`w-5 h-5 transition-transform ${showAdvancedOptions ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdvancedOptions && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entity Types (comma-separated):
                    </label>
                    <input
                      type="text"
                      value={entityTypes}
                      onChange={(e) => setEntityTypes(e.target.value)}
                      placeholder="Person, Organization, Event"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Temperature:
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seed:
                      </label>
                      <input
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(parseInt(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={generateTypes}
                        onChange={(e) => setGenerateTypes(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Generate Types</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={extractSplTriples}
                        onChange={(e) => setExtractSplTriples(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Extract SPL Triples</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={createClassHierarchy}
                        onChange={(e) => setCreateClassHierarchy(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Create Class Hierarchy</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={cache}
                        onChange={(e) => setCache(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Enable Cache</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={cacheInMemory}
                        onChange={(e) => setCacheInMemory(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Cache in Memory</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={enableLogging}
                        onChange={(e) => setEnableLogging(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Enable Logging</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex gap-4">
                <button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !!activeJobId || !text.trim() || !apiKey.trim()}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg shadow-lg transition-all hover:shadow-xl"
                >
                  {activeJobId
                    ? `${jobStatus?.status === "processing" ? "Generating" : "Starting"}...`
                    : generateMutation.isPending
                    ? "Starting..."
                    : "Generate Ontology"}
                </button>

                <button
                  onClick={clearForm}
                  disabled={generateMutation.isPending || !!activeJobId}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Status & Results */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Status</h2>

              {!activeJobId && !jobStatus ? (
                <div className="text-center text-gray-500 py-8">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p>Configure and start generation to see status</p>
                </div>
              ) : activeJobId && (jobStatus?.status === "pending" || jobStatus?.status === "processing") ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-gray-600 mb-2 capitalize">
                    Status: {jobStatus?.status}
                  </p>
                  <p className="text-sm text-gray-500">
                    {jobStatus?.status === "processing"
                      ? "Analyzing text and generating ontology... This may take a while."
                      : "Initializing generation process..."}
                  </p>
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-600">
                      Job ID: {activeJobId}
                    </p>
                  </div>
                </div>
              ) : jobStatus?.status === "completed" ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <svg
                        className="w-5 h-5 text-green-600 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <p className="text-green-800 font-medium">Generation Complete!</p>
                    </div>
                    <p className="text-sm text-green-700">{jobStatus.message}</p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-800 mb-3">Ontology Details:</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Filename:</span>
                        <p className="font-medium text-gray-900">{jobStatus.filename}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">ID:</span>
                        <p className="font-mono text-xs text-gray-900 break-all">{jobStatus.ontology_id}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">IRI:</span>
                        <p className="font-mono text-xs text-gray-900 break-all">{jobStatus.ontology_iri}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (jobStatus.ontology_id) {
                        setSelectedOntology(jobStatus.ontology_id);
                        window.location.href = "/";
                      }
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    View in Visualizer
                  </button>
                </div>
              ) : jobStatus?.status === "failed" ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm font-medium mb-1">Generation Failed</p>
                  <p className="text-red-700 text-sm">{jobStatus.error}</p>
                </div>
              ) : null}

              {/* Existing Ontologies */}
              {ontologies && ontologies.summary.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Recent Ontologies ({ontologies.summary.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {ontologies.summary.slice(0, 5).map((ont: any) => (
                      <div
                        key={ont.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-2 hover:bg-gray-100 transition-colors text-xs"
                      >
                        <p className="font-medium text-gray-900">{ont.filename}</p>
                        <p className="text-gray-600 truncate">{ont.id}</p>
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
  );
}


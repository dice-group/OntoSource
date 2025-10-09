"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createSummaryAllQueryOptions from "@/app/queryOptions/createSummaryAllQueryOptions";
import createOntologyEntitiesQueryOptions from "@/app/queryOptions/createOntologyEntitiesQueryOptions";
import { createInstancesQueryOptions } from "@/app/queryOptions/createInstancesQueryOptions";
import { createNeuralOntologyListQueryOptions } from "@/app/queryOptions/createNeuralOntologyListQueryOptions";
import { createNeuralInstancesQueryOptions } from "@/app/queryOptions/createNeuralInstancesQueryOptions";
import createNeuralOntologyMutationOptions from "@/app/mutationOptions/createNeuralOntologyMutationOptions";
import { useSelectedOntologyId, useSetSelectedOntology } from "@/app/store/ontology-store";
import Header from "@/app/components/Header";

export default function PredictPage() {
  const queryClient = useQueryClient();
  
  // State for ontology selection - use global store
  const selectedOntology = useSelectedOntologyId() || "";
  const setSelectedOntology = useSetSelectedOntology();
  
  // State for class expression
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [expressionSyntax, setExpressionSyntax] = useState<"iri" | "dl" | "manchester">("iri");
  const [customExpression, setCustomExpression] = useState<string>("");
  const [useCustomExpression, setUseCustomExpression] = useState(false);
  
  // State for reasoner configuration
  const [reasonerType, setReasonerType] = useState<"structural" | "sync" | "neural">("structural");
  const [propertyCache, setPropertyCache] = useState(true);
  const [negationDefault, setNegationDefault] = useState(true);
  const [subProperties, setSubProperties] = useState(false);
  const [syncReasonerName, setSyncReasonerName] = useState<"HermiT" | "Pellet" | "ELK" | "JFact" | "Openllet" | "Structural">("HermiT");
  
  // State for neural ontology
  const [selectedNeuralOntology, setSelectedNeuralOntology] = useState<string>("");
  const [showNeuralCreate, setShowNeuralCreate] = useState(false);
  
  // State for triggering predictions
  const [shouldPredict, setShouldPredict] = useState(false);
  
  // Fetch all ontologies
  const { data: ontologies } = useQuery(createSummaryAllQueryOptions());
  
  // Fetch entities for selected ontology
  const { data: entities, isLoading: entitiesLoading } = useQuery(
    createOntologyEntitiesQueryOptions(selectedOntology)
  );
  
  // Fetch neural ontologies
  const { data: neuralOntologies } = useQuery(createNeuralOntologyListQueryOptions());
  
  // Create neural ontology mutation
  const createNeuralOntology = useMutation(createNeuralOntologyMutationOptions());
  
  // Determine which expression to use
  const activeExpression = useCustomExpression ? customExpression : selectedClass;
  
  // Get instances based on reasoner type
  const { data: structuralResults, isLoading: structuralLoading, error: structuralError } = useQuery(
    createInstancesQueryOptions(
      selectedOntology,
      {
        class_expression: activeExpression,
        syntax: expressionSyntax,
        reasoner_type: "structural",
        property_cache: propertyCache,
        negation_default: negationDefault,
        sub_properties: subProperties,
      },
      shouldPredict && reasonerType === "structural" && !!activeExpression
    )
  );
  
  const { data: syncResults, isLoading: syncLoading, error: syncError } = useQuery(
    createInstancesQueryOptions(
      selectedOntology,
      {
        class_expression: activeExpression,
        syntax: expressionSyntax,
        reasoner_type: "sync",
        sync_reasoner_name: syncReasonerName,
      },
      shouldPredict && reasonerType === "sync" && !!activeExpression
    )
  );
  
  const { data: neuralResults, isLoading: neuralLoading, error: neuralError } = useQuery(
    createNeuralInstancesQueryOptions(
      selectedNeuralOntology,
      {
        class_expression: activeExpression,
        syntax: expressionSyntax,
      },
      shouldPredict && reasonerType === "neural" && !!selectedNeuralOntology && !!activeExpression
    )
  );

  const handleCreateNeuralOntology = async () => {
    if (!selectedOntology) return;
    
    try {
      const result = await createNeuralOntology.mutateAsync({
        ontology_id: selectedOntology,
        retrain: true,
      });
      
      queryClient.invalidateQueries({ queryKey: ["neural-ontologies"] });
      setSelectedNeuralOntology(result.neural_ontology_id);
      setShowNeuralCreate(false);
      alert(`Neural ontology created and training started: ${result.neural_ontology_id}`);
    } catch (error) {
      alert(`Failed to create neural ontology: ${error}`);
    }
  };

  const handlePredict = () => {
    const expression = useCustomExpression ? customExpression : selectedClass;
    if (!expression) {
      alert("Please select or enter a class expression");
      return;
    }
    
    if (reasonerType === "neural" && !selectedNeuralOntology) {
      alert("Please create or select a neural ontology");
      return;
    }
    
    setShouldPredict(true);
  };

  const results = reasonerType === "neural" 
    ? neuralResults 
    : reasonerType === "sync" 
    ? syncResults 
    : structuralResults;
  const isLoading = reasonerType === "neural" 
    ? neuralLoading 
    : reasonerType === "sync" 
    ? syncLoading 
    : structuralLoading;
  const error = reasonerType === "neural" 
    ? neuralError 
    : reasonerType === "sync" 
    ? syncError 
    : structuralError;

  return (
    <div className=" bg-gray-50">
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Instance Prediction</h1>
          <p className="text-gray-600">
            Use ontology reasoners to predict instances of class expressions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ontology Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                1. Select Ontology
              </h2>
              <select
                value={selectedOntology}
                onChange={(e) => {
                  setSelectedOntology(e.target.value || null);
                  setSelectedClass("");
                  setShouldPredict(false);
                }}
                className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium shadow-sm"
              >
                <option value="">Select an ontology...</option>
                {ontologies?.summary.map((ont) => (
                  <option key={ont.id} value={ont.id}>
                    {ont.filename} ({ont.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Class Expression Builder */}
            {selectedOntology && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  2. Build Class Expression
                </h2>
                {entitiesLoading ? (
                  <div className="text-gray-500">Loading classes...</div>
                ) : (
                  <div className="space-y-4">
                    {/* Expression Input Mode Toggle */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Expression Input Mode:
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            setUseCustomExpression(false);
                            setExpressionSyntax("iri");
                            setShouldPredict(false);
                          }}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            !useCustomExpression
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          Select from Classes
                        </button>
                        <button
                          onClick={() => {
                            setUseCustomExpression(true);
                            setShouldPredict(false);
                          }}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            useCustomExpression
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          }`}
                        >
                          Custom Expression
                        </button>
                      </div>
                    </div>

                    {/* Syntax Selection (for custom expressions) */}
                    {useCustomExpression && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expression Syntax:
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            onClick={() => {
                              setExpressionSyntax("iri");
                              setShouldPredict(false);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              expressionSyntax === "iri"
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            IRI
                          </button>
                          <button
                            onClick={() => {
                              setExpressionSyntax("dl");
                              setShouldPredict(false);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              expressionSyntax === "dl"
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            DL
                          </button>
                          <button
                            onClick={() => {
                              setExpressionSyntax("manchester");
                              setShouldPredict(false);
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                              expressionSyntax === "manchester"
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            Manchester
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-gray-600 space-y-1">
                          <p>• <strong>IRI:</strong> http://example.com/family#Person</p>
                          <p>• <strong>DL:</strong> ∃ hasChild.male</p>
                          <p>• <strong>Manchester:</strong> female and (hasChild max 2 person)</p>
                        </div>
                      </div>
                    )}

                    {/* Class Selection or Custom Expression Input */}
                    {!useCustomExpression ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select a class:
                        </label>
                        <select
                          value={selectedClass}
                          onChange={(e) => {
                            setSelectedClass(e.target.value);
                            setShouldPredict(false);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        >
                          <option value="">Select a class...</option>
                          {entities?.classes.map((cls) => (
                            <option key={cls.iri} value={cls.iri}>
                              {cls.name} ({cls.iri})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Enter class expression ({expressionSyntax.toUpperCase()}):
                        </label>
                        
                        {/* Helper buttons for inserting classes */}
                        <div className="mb-2">
                          <p className="text-xs text-gray-600 mb-1">Insert class:</p>
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-gray-50 rounded border border-gray-200">
                            {entities?.classes.map((cls) => (
                              <button
                                key={cls.iri}
                                type="button"
                                onClick={() => {
                                  const name = expressionSyntax === "iri" ? cls.iri : cls.name;
                                  setCustomExpression(prev => prev + name + " ");
                                }}
                                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded border border-blue-300 transition-colors font-medium"
                                title={cls.iri}
                              >
                                {cls.name}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Helper buttons for inserting object properties */}
                        {entities?.object_properties && entities.object_properties.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-600 mb-1">Insert object property:</p>
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-gray-50 rounded border border-gray-200">
                              {entities.object_properties.map((prop) => (
                                <button
                                  key={prop.iri}
                                  type="button"
                                  onClick={() => {
                                    const name = expressionSyntax === "iri" ? prop.iri : prop.name;
                                    setCustomExpression(prev => prev + name + " ");
                                  }}
                                  className="px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 rounded border border-orange-300 transition-colors font-medium"
                                  title={prop.iri}
                                >
                                  {prop.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Helper buttons for inserting data properties */}
                        {entities?.data_properties && entities.data_properties.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-600 mb-1">Insert data property:</p>
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-gray-50 rounded border border-gray-200">
                              {entities.data_properties.map((prop) => (
                                <button
                                  key={prop.iri}
                                  type="button"
                                  onClick={() => {
                                    const name = expressionSyntax === "iri" ? prop.iri : prop.name;
                                    setCustomExpression(prev => prev + name + " ");
                                  }}
                                  className="px-2 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 rounded border border-amber-300 transition-colors font-medium"
                                  title={prop.iri}
                                >
                                  {prop.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Helper buttons for DL syntax */}
                        {expressionSyntax === "dl" && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-600 mb-1">Insert operator:</p>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { symbol: "∃", label: "exists (∃)" },
                                { symbol: "∀", label: "forall (∀)" },
                                { symbol: "⊓", label: "and (⊓)" },
                                { symbol: "⊔", label: "or (⊔)" },
                                { symbol: "¬", label: "not (¬)" },
                                { symbol: "⊑", label: "subclass (⊑)" },
                                { symbol: "⊤", label: "top (⊤)" },
                                { symbol: "⊥", label: "bottom (⊥)" },
                                { symbol: ".", label: "role filler separator" },
                              ].map((op) => (
                                <button
                                  key={op.symbol}
                                  type="button"
                                  onClick={() => {
                                    setCustomExpression(prev => prev + op.symbol + " ");
                                  }}
                                  className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 rounded border border-purple-300 transition-colors"
                                  title={op.label}
                                >
                                  {op.symbol}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Helper buttons for Manchester syntax */}
                        {expressionSyntax === "manchester" && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-600 mb-1">Insert operator:</p>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { text: "and", label: "Intersection" },
                                { text: "or", label: "Union" },
                                { text: "not", label: "Negation" },
                                { text: "some", label: "Existential (∃)" },
                                { text: "only", label: "Universal (∀)" },
                                { text: "min", label: "Min cardinality" },
                                { text: "max", label: "Max cardinality" },
                                { text: "exactly", label: "Exact cardinality" },
                                { text: "value", label: "Has value" },
                                { text: "(", label: "Open parenthesis" },
                                { text: ")", label: "Close parenthesis" },
                              ].map((op) => (
                                <button
                                  key={op.text}
                                  type="button"
                                  onClick={() => {
                                    setCustomExpression(prev => prev + op.text + " ");
                                  }}
                                  className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded border border-green-300 transition-colors font-medium"
                                  title={op.label}
                                >
                                  {op.text}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="relative">
                          <textarea
                            value={customExpression}
                            onChange={(e) => {
                              setCustomExpression(e.target.value);
                              setShouldPredict(false);
                            }}
                            placeholder={
                              expressionSyntax === "iri"
                                ? "e.g., http://example.com/family#Person"
                                : expressionSyntax === "dl"
                                ? "e.g., ∃ hasChild.male"
                                : "e.g., female and (hasChild max 2 person)"
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-gray-900 placeholder-gray-500"
                            rows={4}
                          />
                          {customExpression && (
                            <button
                              type="button"
                              onClick={() => {
                                setCustomExpression("");
                                setShouldPredict(false);
                              }}
                              className="absolute top-2 right-2 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded border border-red-300 transition-colors font-medium"
                              title="Clear expression"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Display Active Expression */}
                    {(selectedClass || customExpression) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Active Class Expression {useCustomExpression && `(${expressionSyntax.toUpperCase()})`}:
                        </p>
                        <code className="text-sm text-blue-800 break-all">
                          {useCustomExpression ? customExpression : selectedClass}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Reasoner Selection */}
            {(selectedClass || customExpression) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  3. Configure Reasoner
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reasoner Type:
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => {
                          setReasonerType("structural");
                          setShouldPredict(false);
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          reasonerType === "structural"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        Structural
                      </button>
                      <button
                        onClick={() => {
                          setReasonerType("sync");
                          setShouldPredict(false);
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          reasonerType === "sync"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        Sync
                      </button>
                      <button
                        onClick={() => {
                          setReasonerType("neural");
                          setShouldPredict(false);
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          reasonerType === "neural"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        Neural (EBR)
                      </button>
                    </div>
                  </div>

                  {/* Structural Reasoner Options */}
                  {reasonerType === "structural" && (
                    <div className="border-t pt-4 space-y-3">
                      <h3 className="font-medium text-gray-700">Structural Reasoner Options:</h3>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={propertyCache}
                          onChange={(e) => setPropertyCache(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Property Cache (faster reasoning)
                        </span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={negationDefault}
                          onChange={(e) => setNegationDefault(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Negation Default (missing facts = false)
                        </span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={subProperties}
                          onChange={(e) => setSubProperties(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Consider Sub-properties
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Sync Reasoner Options */}
                  {reasonerType === "sync" && (
                    <div className="border-t pt-4">
                      <h3 className="font-medium text-gray-700 mb-2">Sync Reasoner Options:</h3>
                      <select
                        value={syncReasonerName}
                        onChange={(e) => setSyncReasonerName(e.target.value as any)}
                        className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium shadow-sm"
                      >
                        <option value="HermiT">HermiT</option>
                        <option value="Pellet">Pellet</option>
                        <option value="ELK">ELK</option>
                        <option value="JFact">JFact</option>
                        <option value="Openllet">Openllet</option>
                        <option value="Structural">Structural</option>
                      </select>
                    </div>
                  )}

                  {/* Neural Reasoner Options */}
                  {reasonerType === "neural" && (
                    <div className="border-t pt-4 space-y-3">
                      <h3 className="font-medium text-gray-700">Neural Ontology:</h3>
                      
                      {neuralOntologies && neuralOntologies.neural_ontologies.length > 0 ? (
                        <select
                          value={selectedNeuralOntology}
                          onChange={(e) => setSelectedNeuralOntology(e.target.value)}
                          className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-medium shadow-sm"
                        >
                          <option value="">Select neural ontology...</option>
                          {neuralOntologies.neural_ontologies
                            .filter((no) => no.ontology_id === selectedOntology)
                            .map((no) => (
                              <option key={no.neural_ontology_id} value={no.neural_ontology_id}>
                                {no.neural_ontology_id}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <p className="text-sm text-gray-600">No neural ontologies available.</p>
                      )}
                      
                      <button
                        onClick={() => setShowNeuralCreate(!showNeuralCreate)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        + Create New Neural Ontology
                      </button>
                      
                      {showNeuralCreate && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                          <p className="text-sm text-gray-700">
                            This will create a new neural ontology and start training. Training may take several minutes depending on ontology size.
                          </p>
                          <button
                            onClick={handleCreateNeuralOntology}
                            disabled={createNeuralOntology.isPending}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
                          >
                            {createNeuralOntology.isPending ? "Creating and Training..." : "Create & Train Neural Ontology"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handlePredict}
                    className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg shadow-lg transition-all hover:shadow-xl"
                  >
                    Predict Instances
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Results</h2>
              
              {!shouldPredict ? (
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p>Configure and run prediction to see results</p>
                </div>
              ) : isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-gray-600">Running reasoner...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm font-medium mb-1">Error:</p>
                  <p className="text-red-700 text-sm">{String(error)}</p>
                </div>
              ) : results ? (
                <div>
                  <div className="mb-4 pb-4 border-b">
                    <p className="text-sm text-gray-600 mb-1">Reasoner:</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {"reasoner_type" in results ? results.reasoner_type : reasonerType}
                    </p>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Found {results.individuals.length} instance(s):
                    </p>
                  </div>

                  {results.individuals.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">
                      No instances found
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {results.individuals.map((ind, idx) => (
                        <div
                          key={ind.iri}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                        >
                          <p className="font-medium text-gray-900 text-sm mb-1">
                            {ind.name}
                          </p>
                          <p className="text-xs text-gray-600 break-all">
                            {ind.iri}
                          </p>
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


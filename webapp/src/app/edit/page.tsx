"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import createSummaryAllQueryOptions from "../queryOptions/createSummaryAllQueryOptions";
import createOntologyEntitiesQueryOptions from "../queryOptions/createOntologyEntitiesQueryOptions";
import createCreateOntologyMutationOptions from "../mutationOptions/createCreateOntologyMutationOptions";
import createAddClassMutationOptions from "../mutationOptions/createAddClassMutationOptions";
import createAddObjectPropertyMutationOptions from "../mutationOptions/createAddObjectPropertyMutationOptions";
import createAddDataPropertyMutationOptions from "../mutationOptions/createAddDataPropertyMutationOptions";
import createAddIndividualMutationOptions from "../mutationOptions/createAddIndividualMutationOptions";
import createAddClassAssertionMutationOptions from "../mutationOptions/createAddClassAssertionMutationOptions";
import createAddObjectPropertyAssertionMutationOptions from "../mutationOptions/createAddObjectPropertyAssertionMutationOptions";
import createAddDataPropertyAssertionMutationOptions from "../mutationOptions/createAddDataPropertyAssertionMutationOptions";
import createAddSubclassOfMutationOptions from "../mutationOptions/createAddSubclassOfMutationOptions";
import createSaveOntologyMutationOptions from "../mutationOptions/createSaveOntologyMutationOptions";
import { Ontology, useSelectedOntologyId, useSetSelectedOntology } from "../store/ontology-store";
import Button from "../components/ui/Button";
import { Edit3, Plus, Save, CheckCircle } from "lucide-react";

type AxiomType =
  | "class"
  | "object-property"
  | "data-property"
  | "individual"
  | "class-assertion"
  | "object-property-assertion"
  | "data-property-assertion"
  | "subclass-of";

type EntityItem = { iri: string; name: string };

const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#3B78B8]/20 focus:border-[#3B78B8] text-slate-900 placeholder-slate-400 text-sm transition-colors bg-white";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";
const selectCls = `${inputCls} cursor-pointer`;

const AXIOM_LABELS: Record<AxiomType, string> = {
  "class": "Add Class",
  "object-property": "Add Object Property",
  "data-property": "Add Data Property",
  "individual": "Add Individual",
  "class-assertion": "Add Class Assertion",
  "object-property-assertion": "Add Object Property Assertion",
  "data-property-assertion": "Add Data Property Assertion",
  "subclass-of": "Add Subclass Axiom",
};

function EditPageContent() {
  const { data } = useQuery(createSummaryAllQueryOptions());
  const selectedOntologyId = useSelectedOntologyId();
  const setSelectedOntologyId = useSetSelectedOntology();

  const { data: entitiesData } = useQuery(createOntologyEntitiesQueryOptions(selectedOntologyId));
  const [namespace, setNamespace] = useState<string>("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedAxiomType, setSelectedAxiomType] = useState<AxiomType>("class");

  const [newOntologyIri, setNewOntologyIri] = useState("");
  const [newOntologyFilename, setNewOntologyFilename] = useState("");

  const [className, setClassName] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [individualName, setIndividualName] = useState("");

  const [individualIri, setIndividualIri] = useState("");
  const [assertionClassName, setAssertionClassName] = useState("");
  const [assertionClassNamespace, setAssertionClassNamespace] = useState("");

  const [subjectIri, setSubjectIri] = useState("");
  const [objectIri, setObjectIri] = useState("");
  const [opPropertyName, setOpPropertyName] = useState("");
  const [opPropertyNamespace, setOpPropertyNamespace] = useState("");

  const [dpSubjectIri, setDpSubjectIri] = useState("");
  const [dpPropertyName, setDpPropertyName] = useState("");
  const [dpPropertyNamespace, setDpPropertyNamespace] = useState("");
  const [literalValue, setLiteralValue] = useState("");
  const [literalDatatype, setLiteralDatatype] = useState("");
  const [literalLang, setLiteralLang] = useState("");

  const [subclassName, setSubclassName] = useState("");
  const [subclassNamespace, setSubclassNamespace] = useState("");
  const [superclassName, setSuperclassName] = useState("");
  const [superclassNamespace, setSuperclassNamespace] = useState("");

  const [savePath, setSavePath] = useState("");

  const createOntologyMutation = useMutation(createCreateOntologyMutationOptions());
  const addClassMutation = useMutation(createAddClassMutationOptions(selectedOntologyId || ""));
  const addObjectPropertyMutation = useMutation(createAddObjectPropertyMutationOptions(selectedOntologyId || ""));
  const addDataPropertyMutation = useMutation(createAddDataPropertyMutationOptions(selectedOntologyId || ""));
  const addIndividualMutation = useMutation(createAddIndividualMutationOptions(selectedOntologyId || ""));
  const addClassAssertionMutation = useMutation(createAddClassAssertionMutationOptions(selectedOntologyId || ""));
  const addObjectPropertyAssertionMutation = useMutation(createAddObjectPropertyAssertionMutationOptions(selectedOntologyId || ""));
  const addDataPropertyAssertionMutation = useMutation(createAddDataPropertyAssertionMutationOptions(selectedOntologyId || ""));
  const addSubclassOfMutation = useMutation(createAddSubclassOfMutationOptions(selectedOntologyId || ""));
  const saveOntologyMutation = useMutation(createSaveOntologyMutationOptions(selectedOntologyId || ""));

  const anyPending =
    addClassMutation.isPending || addObjectPropertyMutation.isPending ||
    addDataPropertyMutation.isPending || addIndividualMutation.isPending ||
    addClassAssertionMutation.isPending || addObjectPropertyAssertionMutation.isPending ||
    addDataPropertyAssertionMutation.isPending || addSubclassOfMutation.isPending;

  const selectedOntology = data?.summary?.find((o: Ontology) => o.id === selectedOntologyId);

  useEffect(() => {
    if (selectedOntology) {
      setNamespace(selectedOntology.summary.namespace || selectedOntology.ontology_iri || "");
      setIsCreatingNew(false);
    }
  }, [selectedOntology]);

  const handleSelectOntology = (ontology: Ontology) => {
    setSelectedOntologyId(ontology.id);
    setNamespace(ontology.summary.namespace || ontology.ontology_iri || "");
    setIsCreatingNew(false);
  };

  const handleCreateNewOntology = () => {
    if (!newOntologyIri || !newOntologyFilename) { alert("Please provide both IRI and filename"); return; }
    createOntologyMutation.mutate({ ontology_iri: newOntologyIri, filename: newOntologyFilename });
  };

  const clearForm = () => {
    setClassName(""); setPropertyName(""); setIndividualName(""); setIndividualIri("");
    setAssertionClassName(""); setAssertionClassNamespace(""); setSubjectIri(""); setObjectIri("");
    setOpPropertyName(""); setOpPropertyNamespace(""); setDpSubjectIri(""); setDpPropertyName("");
    setDpPropertyNamespace(""); setLiteralValue(""); setLiteralDatatype(""); setLiteralLang("");
    setSubclassName(""); setSubclassNamespace(""); setSuperclassName(""); setSuperclassNamespace("");
  };

  const handleAddAxiom = () => {
    if (!selectedOntologyId) { alert("Please select or create an ontology first"); return; }
    switch (selectedAxiomType) {
      case "class":
        if (!className || !namespace) { alert("Please provide class name and namespace"); return; }
        addClassMutation.mutate({ namespace, class_name: className }); break;
      case "object-property":
        if (!propertyName || !namespace) { alert("Please provide property name and namespace"); return; }
        addObjectPropertyMutation.mutate({ namespace, property_name: propertyName }); break;
      case "data-property":
        if (!propertyName || !namespace) { alert("Please provide property name and namespace"); return; }
        addDataPropertyMutation.mutate({ namespace, property_name: propertyName }); break;
      case "individual":
        if (!individualName || !namespace) { alert("Please provide individual name and namespace"); return; }
        addIndividualMutation.mutate({ namespace, class_name: individualName }); break;
      case "class-assertion":
        if (!individualIri || !assertionClassName || !assertionClassNamespace) { alert("Please provide all required fields"); return; }
        addClassAssertionMutation.mutate({ individual_iri: individualIri, class_name: assertionClassName, class_namespace: assertionClassNamespace }); break;
      case "object-property-assertion":
        if (!subjectIri || !objectIri || !opPropertyName || !opPropertyNamespace) { alert("Please provide all required fields"); return; }
        addObjectPropertyAssertionMutation.mutate({ subject_iri: subjectIri, object_iri: objectIri, property_name: opPropertyName, property_namespace: opPropertyNamespace }); break;
      case "data-property-assertion":
        if (!dpSubjectIri || !dpPropertyName || !dpPropertyNamespace || !literalValue) { alert("Please provide all required fields"); return; }
        addDataPropertyAssertionMutation.mutate({
          subject_iri: dpSubjectIri, property_name: dpPropertyName, property_namespace: dpPropertyNamespace,
          literal: { value: isNaN(Number(literalValue)) ? literalValue : Number(literalValue), datatype: literalDatatype || null, lang: literalLang || null },
        }); break;
      case "subclass-of":
        if (!subclassName || !subclassNamespace || !superclassName || !superclassNamespace) { alert("Please provide all required fields"); return; }
        addSubclassOfMutation.mutate({ subclass_name: subclassName, subclass_namespace: subclassNamespace, superclass_name: superclassName, superclass_namespace: superclassNamespace }); break;
    }
  };

  return (
    <div className="bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[#3B78B8] flex items-center justify-center">
              <Edit3 className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Ontology Editor</h1>
          </div>
          <p className="text-sm text-slate-500">Create and modify ontologies with ease</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar: ontology selection */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Ontology</h2>
                <button
                  onClick={() => setIsCreatingNew(!isCreatingNew)}
                  className={[
                    "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                    isCreatingNew
                      ? "bg-slate-100 text-slate-600"
                      : "bg-[#3B78B8] text-white hover:bg-[#2A5988]",
                  ].join(" ")}
                >
                  {isCreatingNew ? "Cancel" : "+ New"}
                </button>
              </div>

              <div className="p-4 space-y-4">
                {isCreatingNew && (
                  <div className="bg-[#EBF3FC] rounded-xl p-4 space-y-3 border border-[#B8D4EE]">
                    <p className="text-xs font-semibold text-[#2A5988]">New Ontology</p>
                    <div>
                      <label className={labelCls}>Ontology IRI</label>
                      <input
                        type="text"
                        placeholder="http://example.com/my-ontology#"
                        value={newOntologyIri}
                        onChange={(e) => setNewOntologyIri(e.target.value)}
                        className={inputCls}
                      />
                      <p className="text-xs text-slate-500 mt-1">Should end with #, /, or :</p>
                    </div>
                    <div>
                      <label className={labelCls}>Filename</label>
                      <input
                        type="text"
                        placeholder="my-ontology.owl"
                        value={newOntologyFilename}
                        onChange={(e) => setNewOntologyFilename(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <Button
                      onClick={handleCreateNewOntology}
                      loading={createOntologyMutation.isPending}
                      variant="success"
                      fullWidth
                      size="sm"
                    >
                      Create Ontology
                    </Button>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    Existing Ontologies
                  </p>
                  {data?.summary && data.summary.length > 0 ? (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {data.summary.map((ontology: Ontology) => (
                        <div
                          key={ontology.id}
                          onClick={() => handleSelectOntology(ontology)}
                          className={[
                            "p-3 rounded-xl border cursor-pointer transition-all duration-150",
                            selectedOntologyId === ontology.id
                              ? "border-[#3B78B8] bg-[#EBF3FC]"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-2">
                            {selectedOntologyId === ontology.id && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3B78B8] shrink-0" />
                            )}
                            <p className="text-sm font-semibold text-slate-800 truncate">{ontology.filename}</p>
                          </div>
                          <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{ontology.id.slice(0, 22)}…</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No ontologies available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Namespace + save */}
            {selectedOntology && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">Current Namespace</p>
                  <code className="text-xs text-slate-700 font-mono break-all bg-slate-50 rounded-lg px-3 py-2 block border border-slate-200">
                    {namespace || "No namespace set"}
                  </code>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Save to File</p>
                  <input
                    type="text"
                    placeholder="file:///path/to/save.owl"
                    value={savePath}
                    onChange={(e) => setSavePath(e.target.value)}
                    className={`${inputCls} mb-2`}
                  />
                  <Button
                    onClick={() => savePath && saveOntologyMutation.mutate(savePath)}
                    loading={saveOntologyMutation.isPending}
                    disabled={!savePath}
                    variant="secondary"
                    fullWidth
                    size="sm"
                    icon={<Save className="w-3.5 h-3.5" />}
                  >
                    Save Ontology
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right main: axiom editor */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#3B78B8] text-white text-xs font-bold shrink-0">
                  <Plus className="w-4 h-4" />
                </span>
                <h2 className="text-base font-semibold text-slate-900">Add Axioms</h2>
              </div>

              <div className="p-6">
                {!selectedOntologyId ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Edit3 className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium mb-1">No ontology selected</p>
                    <p className="text-sm text-slate-400">Select or create an ontology to start editing</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <label className={labelCls}>Axiom Type</label>
                      <select
                        value={selectedAxiomType}
                        onChange={(e) => { setSelectedAxiomType(e.target.value as AxiomType); clearForm(); }}
                        className={selectCls}
                      >
                        {(Object.entries(AXIOM_LABELS) as [AxiomType, string][]).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      {(selectedAxiomType === "class" || selectedAxiomType === "object-property" || selectedAxiomType === "data-property" || selectedAxiomType === "individual") && (
                        <div>
                          <label className={labelCls}>Namespace</label>
                          <input type="text" value={namespace} onChange={(e) => setNamespace(e.target.value)} className={inputCls} placeholder="http://example.com/ontology#" />
                        </div>
                      )}

                      {selectedAxiomType === "class" && (
                        <div>
                          <label className={labelCls}>Class Name</label>
                          <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} className={inputCls} placeholder="Person" />
                        </div>
                      )}

                      {(selectedAxiomType === "object-property" || selectedAxiomType === "data-property") && (
                        <div>
                          <label className={labelCls}>Property Name</label>
                          <input type="text" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} className={inputCls} placeholder={selectedAxiomType === "object-property" ? "hasParent" : "hasAge"} />
                        </div>
                      )}

                      {selectedAxiomType === "individual" && (
                        <div>
                          <label className={labelCls}>Individual Name</label>
                          <input type="text" value={individualName} onChange={(e) => setIndividualName(e.target.value)} className={inputCls} placeholder="John" />
                        </div>
                      )}

                      {selectedAxiomType === "class-assertion" && (
                        <>
                          <div>
                            <label className={labelCls}>Individual</label>
                            <select value={individualIri} onChange={(e) => setIndividualIri(e.target.value)} className={selectCls}>
                              <option value="">Select an individual…</option>
                              {entitiesData?.individuals.map((ind) => (
                                <option key={ind.iri} value={ind.iri}>{ind.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Class</label>
                            <select value={assertionClassName} onChange={(e) => {
                              const cls = entitiesData?.classes.find((c) => c.name === e.target.value);
                              setAssertionClassName(e.target.value);
                              if (cls) setAssertionClassNamespace(cls.iri.substring(0, cls.iri.lastIndexOf(cls.name)));
                            }} className={selectCls}>
                              <option value="">Select a class…</option>
                              {entitiesData?.classes.map((cls) => (
                                <option key={cls.iri} value={cls.name}>{cls.name}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      {selectedAxiomType === "object-property-assertion" && (
                        <>
                          <div>
                            <label className={labelCls}>Subject (Individual)</label>
                            <select value={subjectIri} onChange={(e) => setSubjectIri(e.target.value)} className={selectCls}>
                              <option value="">Select subject…</option>
                              {entitiesData?.individuals.map((ind) => <option key={ind.iri} value={ind.iri}>{ind.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Object Property</label>
                            <select value={opPropertyName} onChange={(e) => {
                              const prop = entitiesData?.object_properties.find((p) => p.name === e.target.value);
                              setOpPropertyName(e.target.value);
                              if (prop) setOpPropertyNamespace(prop.iri.substring(0, prop.iri.lastIndexOf(prop.name)));
                            }} className={selectCls}>
                              <option value="">Select property…</option>
                              {entitiesData?.object_properties.map((prop) => <option key={prop.iri} value={prop.name}>{prop.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Object (Individual)</label>
                            <select value={objectIri} onChange={(e) => setObjectIri(e.target.value)} className={selectCls}>
                              <option value="">Select object…</option>
                              {entitiesData?.individuals.map((ind) => <option key={ind.iri} value={ind.iri}>{ind.name}</option>)}
                            </select>
                          </div>
                        </>
                      )}

                      {selectedAxiomType === "data-property-assertion" && (
                        <>
                          <div>
                            <label className={labelCls}>Subject (Individual)</label>
                            <select value={dpSubjectIri} onChange={(e) => setDpSubjectIri(e.target.value)} className={selectCls}>
                              <option value="">Select individual…</option>
                              {entitiesData?.individuals.map((ind) => <option key={ind.iri} value={ind.iri}>{ind.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Data Property</label>
                            <select value={dpPropertyName} onChange={(e) => {
                              const prop = entitiesData?.data_properties.find((p) => p.name === e.target.value);
                              setDpPropertyName(e.target.value);
                              if (prop) setDpPropertyNamespace(prop.iri.substring(0, prop.iri.lastIndexOf(prop.name)));
                            }} className={selectCls}>
                              <option value="">Select property…</option>
                              {entitiesData?.data_properties.map((prop) => <option key={prop.iri} value={prop.name}>{prop.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Literal Value</label>
                            <input type="text" value={literalValue} onChange={(e) => setLiteralValue(e.target.value)} className={inputCls} placeholder="25" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className={labelCls}>Datatype <span className="font-normal text-slate-400">(optional)</span></label>
                              <input type="text" value={literalDatatype} onChange={(e) => setLiteralDatatype(e.target.value)} className={inputCls} placeholder="xsd:integer" />
                            </div>
                            <div>
                              <label className={labelCls}>Language <span className="font-normal text-slate-400">(optional)</span></label>
                              <input type="text" value={literalLang} onChange={(e) => setLiteralLang(e.target.value)} className={inputCls} placeholder="en" />
                            </div>
                          </div>
                        </>
                      )}

                      {selectedAxiomType === "subclass-of" && (
                        <>
                          <div>
                            <label className={labelCls}>Subclass</label>
                            <select value={subclassName} onChange={(e) => {
                              const cls = entitiesData?.classes.find((c) => c.name === e.target.value);
                              setSubclassName(e.target.value);
                              if (cls) setSubclassNamespace(cls.iri.substring(0, cls.iri.lastIndexOf(cls.name)));
                            }} className={selectCls}>
                              <option value="">Select subclass…</option>
                              {entitiesData?.classes.map((cls) => <option key={cls.iri} value={cls.name}>{cls.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Superclass</label>
                            <select value={superclassName} onChange={(e) => {
                              const cls = entitiesData?.classes.find((c) => c.name === e.target.value);
                              setSuperclassName(e.target.value);
                              if (cls) setSuperclassNamespace(cls.iri.substring(0, cls.iri.lastIndexOf(cls.name)));
                            }} className={selectCls}>
                              <option value="">Select superclass…</option>
                              {entitiesData?.classes.map((cls) => <option key={cls.iri} value={cls.name}>{cls.name}</option>)}
                            </select>
                          </div>
                        </>
                      )}

                      <div className="pt-2">
                        <Button
                          onClick={handleAddAxiom}
                          loading={anyPending}
                          fullWidth
                          size="lg"
                          icon={<Plus className="w-4 h-4" />}
                        >
                          {anyPending ? "Adding…" : AXIOM_LABELS[selectedAxiomType]}
                        </Button>
                      </div>
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

export default function EditPage() {
  return <EditPageContent />;
}

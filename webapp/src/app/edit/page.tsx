"use client";

import { api } from "../lib/api";
import { invalidateOntologyQueries } from "../lib/ontology-cache";
import { toast } from "sonner";
import DownloadOntology from "../components/DownloadOntology";
import PageHeader from "../components/ui/PageHeader";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Edit3, Plus, Save } from "lucide-react";

type AxiomType =
  | "class"
  | "object-property"
  | "data-property"
  | "individual"
  | "class-assertion"
  | "object-property-assertion"
  | "data-property-assertion"
  | "subclass-of";


const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 placeholder-slate-500 text-sm transition-colors bg-white";
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
  const queryClient = useQueryClient();
  const { data } = useQuery(createSummaryAllQueryOptions());
  const selectedOntologyId = useSelectedOntologyId();
  const setSelectedOntologyId = useSetSelectedOntology();

  const { data: entitiesData } = useQuery(createOntologyEntitiesQueryOptions(selectedOntologyId));
  const [namespace, setNamespace] = useState<string>("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [removeMode, setRemoveMode] = useState(false);
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

  const createOntologyMutation = useMutation(createCreateOntologyMutationOptions(queryClient));
  const addClassMutation = useMutation(createAddClassMutationOptions(queryClient, selectedOntologyId || ""));
  const addObjectPropertyMutation = useMutation(createAddObjectPropertyMutationOptions(queryClient, selectedOntologyId || ""));
  const addDataPropertyMutation = useMutation(createAddDataPropertyMutationOptions(queryClient, selectedOntologyId || ""));
  const addIndividualMutation = useMutation(createAddIndividualMutationOptions(queryClient, selectedOntologyId || ""));
  const addClassAssertionMutation = useMutation(createAddClassAssertionMutationOptions(queryClient, selectedOntologyId || ""));
  const addObjectPropertyAssertionMutation = useMutation(createAddObjectPropertyAssertionMutationOptions(queryClient, selectedOntologyId || ""));
  const addDataPropertyAssertionMutation = useMutation(createAddDataPropertyAssertionMutationOptions(queryClient, selectedOntologyId || ""));
  const addSubclassOfMutation = useMutation(createAddSubclassOfMutationOptions(queryClient, selectedOntologyId || ""));
  const saveOntologyMutation = useMutation(createSaveOntologyMutationOptions(selectedOntologyId || ""));

  const removeAxiomMutation = useMutation({
    mutationFn: (body: object) => api(`modify/${selectedOntologyId}/axiom`, body, "DELETE"),
    onSuccess: () => { invalidateOntologyQueries(queryClient, selectedOntologyId || undefined); toast.success("Axiom removed"); },
    onError: (error: Error) => toast.error(error.message),
  });

  const anyPending = removeAxiomMutation.isPending ||
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
    createOntologyMutation.mutate({ ontology_iri: newOntologyIri, filename: newOntologyFilename }, { onSuccess: (ontology) => { setSelectedOntologyId(ontology.id); setIsCreatingNew(false); } });
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
    if (removeMode) {
      const normalized = /[#/:]$/.test(namespace) ? namespace : namespace + "#";
      const payloads: Record<AxiomType, Record<string, unknown>> = {
        "class": { axiom_type: "declaration", entity_iri: className && normalized + className },
        "individual": { axiom_type: "declaration", entity_iri: individualName && normalized + individualName },
        "object-property": { axiom_type: "declaration", entity_iri: propertyName && normalized + propertyName },
        "data-property": { axiom_type: "declaration", entity_iri: propertyName && normalized + propertyName },
        "class-assertion": { axiom_type: "class_assertion", individual_iri: individualIri, class_name: assertionClassName, class_namespace: assertionClassNamespace },
        "object-property-assertion": { axiom_type: "object_property_assertion", subject_iri: subjectIri, object_iri: objectIri, property_name: opPropertyName, property_namespace: opPropertyNamespace },
        "data-property-assertion": { axiom_type: "data_property_assertion", subject_iri: dpSubjectIri, property_name: dpPropertyName, property_namespace: dpPropertyNamespace, literal: { value: literalValue, datatype: literalDatatype || null, lang: literalLang || null } },
        "subclass-of": { axiom_type: "subclass_of", subclass_name: subclassName, subclass_namespace: subclassNamespace, superclass_name: superclassName, superclass_namespace: superclassNamespace },
      };
      const body = payloads[selectedAxiomType];
      if (Object.values(body).some((value) => value === "")) { toast.error("Complete the axiom fields before removing it"); return; }
      if (window.confirm("Remove this axiom from the selected ontology?")) removeAxiomMutation.mutate(body);
      return;
    }
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
    <div className="workspace-page">
      <div className="workspace-content">
        <PageHeader title="Ontology Editor" description="Manage entities and assertions, then download your ontology." />

        <div className="editor-layout">
          {/* Left sidebar: ontology selection */}
          <div className="lg:col-span-1 space-y-4">
            <div className="surface-panel">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Ontology</h2>
                <button
                  onClick={() => setIsCreatingNew(!isCreatingNew)}
                  className={[
                    "text-xs font-medium px-3 py-1.5 rounded-lg transition-colors",
                    isCreatingNew
                      ? "bg-slate-100 text-slate-600"
                      : "bg-primary text-white hover:bg-primary-dark",
                  ].join(" ")}
                >
                  {isCreatingNew ? "Cancel" : "+ New"}
                </button>
              </div>

              <div className="p-4 space-y-4">
                {isCreatingNew && (
                  <div className="bg-primary-surface rounded-xl p-4 space-y-3 border border-primary-border">
                    <p className="text-xs font-semibold text-primary-dark">New Ontology</p>
                    <div>
                      <label htmlFor="edit-field-1" className={labelCls}>Ontology IRI</label>
                      <input id="edit-field-1"
                        type="text"
                        placeholder="http://example.com/my-ontology#"
                        value={newOntologyIri}
                        onChange={(e) => setNewOntologyIri(e.target.value)}
                        className={inputCls}
                      />
                      <p className="text-xs text-slate-500 mt-1">Should end with #, /, or :</p>
                    </div>
                    <div>
                      <label htmlFor="edit-field-2" className={labelCls}>Filename</label>
                      <input id="edit-field-2"
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
                          role="button"
                          tabIndex={0}
                          aria-pressed={selectedOntologyId === ontology.id}
                          onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleSelectOntology(ontology); } }}
                          onClick={() => handleSelectOntology(ontology)}
                          className={[
                            "p-3 rounded-xl border cursor-pointer transition-colors duration-150",
                            selectedOntologyId === ontology.id
                              ? "border-primary bg-primary-surface"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-2">
                            {selectedOntologyId === ontology.id && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            )}
                            <p className="text-sm font-semibold text-slate-800 truncate">{ontology.filename}</p>
                          </div>
                          <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{ontology.id.slice(0, 22)}…</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">No ontologies available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Namespace + save */}
            {selectedOntology && (
              <div className="surface-panel p-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1.5">Current Namespace</p>
                  <code className="text-xs text-slate-700 font-mono break-all bg-slate-50 rounded-lg px-3 py-2 block border border-slate-200">
                    {namespace || "No namespace set"}
                  </code>
                </div>

                <DownloadOntology id={selectedOntologyId!} filename={selectedOntology.filename} />
                <details className="border-t border-slate-100 pt-4"><summary className="text-xs font-semibold mb-3">Save on server</summary>
                  <p className="text-xs font-semibold text-slate-700 mb-2">Save to File</p>
                  <input
                    type="text"
                    aria-label="Save to File"
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
                </details>
              </div>
            )}
          </div>

          {/* Right main: axiom editor */}
          <div className="lg:col-span-2">
            <div className="surface-panel">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-xs font-bold shrink-0">
                  <Plus className="w-4 h-4" />
                </span>
                <h2 className="text-base font-semibold text-slate-900">Edit axioms</h2>
              </div>

              <div className="p-6">
                {!selectedOntologyId ? (
                  <div className="text-center py-12">
                    <div className="empty-state-icon">
                      <Edit3 className="w-6 h-6 text-slate-500" />
                    </div>
                    <p className="text-slate-600 font-medium mb-1">No ontology selected</p>
                    <p className="text-sm text-slate-500">Select or create an ontology to start editing</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex gap-4 text-sm" role="group" aria-label="Axiom operation">
                      <button type="button" aria-pressed={!removeMode} className={!removeMode ? "font-semibold text-primary underline" : "text-slate-500"} onClick={() => setRemoveMode(false)}>Add axiom</button>
                      <button type="button" aria-pressed={removeMode} className={removeMode ? "font-semibold text-primary underline" : "text-slate-500"} onClick={() => setRemoveMode(true)}>Remove axiom</button>
                    </div>
                    <nav className="axiom-tools" aria-label="Editing tools">
                      {(Object.entries(AXIOM_LABELS) as [AxiomType, string][]).map(([value, label]) => <button key={value} type="button" aria-pressed={selectedAxiomType === value} onClick={() => { setSelectedAxiomType(value); clearForm(); }}>{label.replace("Add ", "")}</button>)}
                    </nav>
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      {(selectedAxiomType === "class" || selectedAxiomType === "object-property" || selectedAxiomType === "data-property" || selectedAxiomType === "individual") && (
                        <div>
                          <label htmlFor="edit-field-4" className={labelCls}>Namespace</label>
                          <input id="edit-field-4" type="text" value={namespace} onChange={(e) => setNamespace(e.target.value)} className={inputCls} placeholder="http://example.com/ontology#" />
                        </div>
                      )}

                      {selectedAxiomType === "class" && (
                        <div>
                          <label htmlFor="edit-field-5" className={labelCls}>Class Name</label>
                          <input id="edit-field-5" type="text" value={className} onChange={(e) => setClassName(e.target.value)} className={inputCls} placeholder="Person" />
                        </div>
                      )}

                      {(selectedAxiomType === "object-property" || selectedAxiomType === "data-property") && (
                        <div>
                          <label htmlFor="edit-field-6" className={labelCls}>Property Name</label>
                          <input id="edit-field-6" type="text" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} className={inputCls} placeholder={selectedAxiomType === "object-property" ? "hasParent" : "hasAge"} />
                        </div>
                      )}

                      {selectedAxiomType === "individual" && (
                        <div>
                          <label htmlFor="edit-field-7" className={labelCls}>Individual Name</label>
                          <input id="edit-field-7" type="text" value={individualName} onChange={(e) => setIndividualName(e.target.value)} className={inputCls} placeholder="John" />
                        </div>
                      )}

                      {selectedAxiomType === "class-assertion" && (
                        <>
                          <div>
                            <label htmlFor="edit-field-8" className={labelCls}>Individual</label>
                            <select id="edit-field-8" value={individualIri} onChange={(e) => setIndividualIri(e.target.value)} className={selectCls}>
                              <option value="">Select an individual…</option>
                              {entitiesData?.individuals.map((ind) => (
                                <option key={ind.iri} value={ind.iri}>{ind.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="edit-field-9" className={labelCls}>Class</label>
                            <select id="edit-field-9" value={assertionClassName} onChange={(e) => {
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
                            <label htmlFor="edit-field-10" className={labelCls}>Subject (Individual)</label>
                            <select id="edit-field-10" value={subjectIri} onChange={(e) => setSubjectIri(e.target.value)} className={selectCls}>
                              <option value="">Select subject…</option>
                              {entitiesData?.individuals.map((ind) => <option key={ind.iri} value={ind.iri}>{ind.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="edit-field-11" className={labelCls}>Object Property</label>
                            <select id="edit-field-11" value={opPropertyName} onChange={(e) => {
                              const prop = entitiesData?.object_properties.find((p) => p.name === e.target.value);
                              setOpPropertyName(e.target.value);
                              if (prop) setOpPropertyNamespace(prop.iri.substring(0, prop.iri.lastIndexOf(prop.name)));
                            }} className={selectCls}>
                              <option value="">Select property…</option>
                              {entitiesData?.object_properties.map((prop) => <option key={prop.iri} value={prop.name}>{prop.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="edit-field-12" className={labelCls}>Object (Individual)</label>
                            <select id="edit-field-12" value={objectIri} onChange={(e) => setObjectIri(e.target.value)} className={selectCls}>
                              <option value="">Select object…</option>
                              {entitiesData?.individuals.map((ind) => <option key={ind.iri} value={ind.iri}>{ind.name}</option>)}
                            </select>
                          </div>
                        </>
                      )}

                      {selectedAxiomType === "data-property-assertion" && (
                        <>
                          <div>
                            <label htmlFor="edit-field-13" className={labelCls}>Subject (Individual)</label>
                            <select id="edit-field-13" value={dpSubjectIri} onChange={(e) => setDpSubjectIri(e.target.value)} className={selectCls}>
                              <option value="">Select individual…</option>
                              {entitiesData?.individuals.map((ind) => <option key={ind.iri} value={ind.iri}>{ind.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="edit-field-14" className={labelCls}>Data Property</label>
                            <select id="edit-field-14" value={dpPropertyName} onChange={(e) => {
                              const prop = entitiesData?.data_properties.find((p) => p.name === e.target.value);
                              setDpPropertyName(e.target.value);
                              if (prop) setDpPropertyNamespace(prop.iri.substring(0, prop.iri.lastIndexOf(prop.name)));
                            }} className={selectCls}>
                              <option value="">Select property…</option>
                              {entitiesData?.data_properties.map((prop) => <option key={prop.iri} value={prop.name}>{prop.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="edit-field-15" className={labelCls}>Literal Value</label>
                            <input id="edit-field-15" type="text" value={literalValue} onChange={(e) => setLiteralValue(e.target.value)} className={inputCls} placeholder="25" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="edit-field-16" className={labelCls}>Datatype <span className="font-normal text-slate-500">(optional)</span></label>
                              <input id="edit-field-16" type="text" value={literalDatatype} onChange={(e) => setLiteralDatatype(e.target.value)} className={inputCls} placeholder="xsd:integer" />
                            </div>
                            <div>
                              <label htmlFor="edit-field-17" className={labelCls}>Language <span className="font-normal text-slate-500">(optional)</span></label>
                              <input id="edit-field-17" type="text" value={literalLang} onChange={(e) => setLiteralLang(e.target.value)} className={inputCls} placeholder="en" />
                            </div>
                          </div>
                        </>
                      )}

                      {selectedAxiomType === "subclass-of" && (
                        <>
                          <div>
                            <label htmlFor="edit-field-18" className={labelCls}>Subclass</label>
                            <select id="edit-field-18" value={subclassName} onChange={(e) => {
                              const cls = entitiesData?.classes.find((c) => c.name === e.target.value);
                              setSubclassName(e.target.value);
                              if (cls) setSubclassNamespace(cls.iri.substring(0, cls.iri.lastIndexOf(cls.name)));
                            }} className={selectCls}>
                              <option value="">Select subclass…</option>
                              {entitiesData?.classes.map((cls) => <option key={cls.iri} value={cls.name}>{cls.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label htmlFor="edit-field-19" className={labelCls}>Superclass</label>
                            <select id="edit-field-19" value={superclassName} onChange={(e) => {
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
                          {anyPending ? "Saving…" : removeMode ? AXIOM_LABELS[selectedAxiomType].replace("Add", "Remove") : AXIOM_LABELS[selectedAxiomType]}
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

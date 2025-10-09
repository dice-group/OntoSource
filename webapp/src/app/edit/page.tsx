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

type AxiomType =
  | "class"
  | "object-property"
  | "data-property"
  | "individual"
  | "class-assertion"
  | "object-property-assertion"
  | "data-property-assertion"
  | "subclass-of";

type EntityItem = {
  iri: string;
  name: string;
};

type EntitiesResponse = {
  classes: EntityItem[];
  individuals: EntityItem[];
  object_properties: EntityItem[];
  data_properties: EntityItem[];
};

function EditPageContent() {
  const { data } = useQuery(createSummaryAllQueryOptions());

  const selectedOntologyId = useSelectedOntologyId();
  const setSelectedOntologyId = useSetSelectedOntology();

  const { data: entitiesData } = useQuery(
    createOntologyEntitiesQueryOptions(selectedOntologyId),
  );
  const [namespace, setNamespace] = useState<string>("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedAxiomType, setSelectedAxiomType] =
    useState<AxiomType>("class");

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

  const createOntologyMutation = useMutation(
    createCreateOntologyMutationOptions(),
  );

  const addClassMutation = useMutation(
    createAddClassMutationOptions(selectedOntologyId || ""),
  );

  const addObjectPropertyMutation = useMutation(
    createAddObjectPropertyMutationOptions(selectedOntologyId || ""),
  );

  const addDataPropertyMutation = useMutation(
    createAddDataPropertyMutationOptions(selectedOntologyId || ""),
  );

  const addIndividualMutation = useMutation(
    createAddIndividualMutationOptions(selectedOntologyId || ""),
  );

  const addClassAssertionMutation = useMutation(
    createAddClassAssertionMutationOptions(selectedOntologyId || ""),
  );

  const addObjectPropertyAssertionMutation = useMutation(
    createAddObjectPropertyAssertionMutationOptions(selectedOntologyId || ""),
  );

  const addDataPropertyAssertionMutation = useMutation(
    createAddDataPropertyAssertionMutationOptions(selectedOntologyId || ""),
  );

  const addSubclassOfMutation = useMutation(
    createAddSubclassOfMutationOptions(selectedOntologyId || ""),
  );

  const saveOntologyMutation = useMutation(
    createSaveOntologyMutationOptions(selectedOntologyId || ""),
  );

  const selectedOntology = data?.summary?.find(
    (o: Ontology) => o.id === selectedOntologyId,
  );

  // Automatically set namespace when selected ontology changes
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
    if (!newOntologyIri || !newOntologyFilename) {
      alert("Please provide both IRI and filename");
      return;
    }
    createOntologyMutation.mutate({
      ontology_iri: newOntologyIri,
      filename: newOntologyFilename,
    });
  };

  const handleAddAxiom = () => {
    if (!selectedOntologyId) {
      alert("Please select or create an ontology first");
      return;
    }

    switch (selectedAxiomType) {
      case "class":
        if (!className || !namespace) {
          alert("Please provide class name and namespace");
          return;
        }
        addClassMutation.mutate({ namespace, class_name: className });
        break;

      case "object-property":
        if (!propertyName || !namespace) {
          alert("Please provide property name and namespace");
          return;
        }
        addObjectPropertyMutation.mutate({
          namespace,
          property_name: propertyName,
        });
        break;

      case "data-property":
        if (!propertyName || !namespace) {
          alert("Please provide property name and namespace");
          return;
        }
        addDataPropertyMutation.mutate({
          namespace,
          property_name: propertyName,
        });
        break;

      case "individual":
        if (!individualName || !namespace) {
          alert("Please provide individual name and namespace");
          return;
        }
        addIndividualMutation.mutate({ namespace, class_name: individualName });
        break;

      case "class-assertion":
        if (!individualIri || !assertionClassName || !assertionClassNamespace) {
          alert("Please provide all required fields");
          return;
        }
        addClassAssertionMutation.mutate({
          individual_iri: individualIri,
          class_name: assertionClassName,
          class_namespace: assertionClassNamespace,
        });
        break;

      case "object-property-assertion":
        if (
          !subjectIri ||
          !objectIri ||
          !opPropertyName ||
          !opPropertyNamespace
        ) {
          alert("Please provide all required fields");
          return;
        }
        addObjectPropertyAssertionMutation.mutate({
          subject_iri: subjectIri,
          object_iri: objectIri,
          property_name: opPropertyName,
          property_namespace: opPropertyNamespace,
        });
        break;

      case "data-property-assertion":
        if (
          !dpSubjectIri ||
          !dpPropertyName ||
          !dpPropertyNamespace ||
          !literalValue
        ) {
          alert("Please provide all required fields");
          return;
        }
        addDataPropertyAssertionMutation.mutate({
          subject_iri: dpSubjectIri,
          property_name: dpPropertyName,
          property_namespace: dpPropertyNamespace,
          literal: {
            value: isNaN(Number(literalValue))
              ? literalValue
              : Number(literalValue),
            datatype: literalDatatype || null,
            lang: literalLang || null,
          },
        });
        break;

      case "subclass-of":
        if (
          !subclassName ||
          !subclassNamespace ||
          !superclassName ||
          !superclassNamespace
        ) {
          alert("Please provide all required fields");
          return;
        }
        addSubclassOfMutation.mutate({
          subclass_name: subclassName,
          subclass_namespace: subclassNamespace,
          superclass_name: superclassName,
          superclass_namespace: superclassNamespace,
        });
        break;
    }
  };

  const clearForm = () => {
    setClassName("");
    setPropertyName("");
    setIndividualName("");
    setIndividualIri("");
    setAssertionClassName("");
    setAssertionClassNamespace("");
    setSubjectIri("");
    setObjectIri("");
    setOpPropertyName("");
    setOpPropertyNamespace("");
    setDpSubjectIri("");
    setDpPropertyName("");
    setDpPropertyNamespace("");
    setLiteralValue("");
    setLiteralDatatype("");
    setLiteralLang("");
    setSubclassName("");
    setSubclassNamespace("");
    setSuperclassName("");
    setSuperclassNamespace("");
  };

  return (
    <div className=" bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ontology Editor
          </h1>
          <p className="text-gray-600">
            Create and modify ontologies with ease
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Select or Create Ontology
              </h2>

              <div className="mb-4">
                <button
                  onClick={() => setIsCreatingNew(!isCreatingNew)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {isCreatingNew ? "Cancel" : "Create New Ontology"}
                </button>
              </div>

              {isCreatingNew && (
                <div className="mb-4 p-4 bg-gray-50 rounded-md">
                  <input
                    type="text"
                    placeholder="Ontology IRI (e.g., http://example.com/my-ontology#)"
                    value={newOntologyIri}
                    onChange={(e) => setNewOntologyIri(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md mb-2 text-gray-900 placeholder-gray-500"
                  />
                  <p className="text-xs text-gray-600 mb-2">
                    IRI should end with #, /, or :
                  </p>
                  <input
                    type="text"
                    placeholder="Filename (e.g., my-ontology.owl)"
                    value={newOntologyFilename}
                    onChange={(e) => setNewOntologyFilename(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md mb-2 text-gray-900 placeholder-gray-500"
                  />
                  <button
                    onClick={handleCreateNewOntology}
                    disabled={createOntologyMutation.isPending}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400"
                  >
                    {createOntologyMutation.isPending
                      ? "Creating..."
                      : "Create"}
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">
                  Existing Ontologies
                </h3>
                {data?.summary && data.summary.length > 0 ? (
                  data.summary.map((ontology: Ontology) => (
                    <div
                      key={ontology.id}
                      onClick={() => handleSelectOntology(ontology)}
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selectedOntologyId === ontology.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <p className="font-medium text-sm text-gray-900">
                        {ontology.filename}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {ontology.id}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    No ontologies available
                  </p>
                )}
              </div>
            </div>

            {selectedOntology && (
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Current Namespace
                </h3>
                <p className="text-sm text-gray-900 break-all font-mono bg-gray-50 p-2 rounded">
                  {namespace || "No namespace set"}
                </p>

                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Save Ontology
                  </h4>
                  <input
                    type="text"
                    placeholder="file:///path/to/save.owl"
                    value={savePath}
                    onChange={(e) => setSavePath(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md mb-2 text-sm text-gray-900 placeholder-gray-500"
                  />
                  <button
                    onClick={() =>
                      savePath && saveOntologyMutation.mutate(savePath)
                    }
                    disabled={saveOntologyMutation.isPending || !savePath}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-400 text-sm"
                  >
                    {saveOntologyMutation.isPending
                      ? "Saving..."
                      : "Save Ontology"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Add Axioms
              </h2>

              {!selectedOntologyId ? (
                <p className="text-gray-500">
                  Please select or create an ontology to start editing
                </p>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Namespaces should end with #, /, or
                      : (they will be auto-corrected with # if missing)
                    </p>
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Axiom Type
                    </label>
                    <select
                      value={selectedAxiomType}
                      onChange={(e) => {
                        setSelectedAxiomType(e.target.value as AxiomType);
                        clearForm();
                      }}
                      className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-500"
                    >
                      <option value="class">Add Class</option>
                      <option value="object-property">
                        Add Object Property
                      </option>
                      <option value="data-property">Add Data Property</option>
                      <option value="individual">Add Individual</option>
                      <option value="class-assertion">
                        Add Class Assertion
                      </option>
                      <option value="object-property-assertion">
                        Add Object Property Assertion
                      </option>
                      <option value="data-property-assertion">
                        Add Data Property Assertion
                      </option>
                      <option value="subclass-of">Add Subclass Axiom</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    {selectedAxiomType === "class" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Namespace
                          </label>
                          <input
                            type="text"
                            value={namespace}
                            onChange={(e) => setNamespace(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-500"
                            placeholder="http://example.com/ontology#"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Class Name
                          </label>
                          <input
                            type="text"
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-500"
                            placeholder="Person"
                          />
                        </div>
                      </>
                    )}

                    {(selectedAxiomType === "object-property" ||
                      selectedAxiomType === "data-property") && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Namespace
                          </label>
                          <input
                            type="text"
                            value={namespace}
                            onChange={(e) => setNamespace(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-500"
                            placeholder="http://example.com/ontology#"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Property Name
                          </label>
                          <input
                            type="text"
                            value={propertyName}
                            onChange={(e) => setPropertyName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-500"
                            placeholder={
                              selectedAxiomType === "object-property"
                                ? "hasParent"
                                : "hasAge"
                            }
                          />
                        </div>
                      </>
                    )}

                    {selectedAxiomType === "individual" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Namespace
                          </label>
                          <input
                            type="text"
                            value={namespace}
                            onChange={(e) => setNamespace(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-500"
                            placeholder="http://example.com/ontology#"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Individual Name
                          </label>
                          <input
                            type="text"
                            value={individualName}
                            onChange={(e) => setIndividualName(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-500"
                            placeholder="John"
                          />
                        </div>
                      </>
                    )}

                    {selectedAxiomType === "class-assertion" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Individual
                          </label>
                          <select
                            value={individualIri}
                            onChange={(e) => setIndividualIri(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-gray-900"
                          >
                            <option value="">Select an individual...</option>
                            {entitiesData?.individuals.map((ind) => (
                              <option key={ind.iri} value={ind.iri}>
                                {ind.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Class
                          </label>
                          <select
                            value={assertionClassName}
                            onChange={(e) => {
                              const selectedClass = entitiesData?.classes.find(
                                (c) => c.name === e.target.value,
                              );
                              setAssertionClassName(e.target.value);
                              if (selectedClass) {
                                const iri = selectedClass.iri;
                                const namespace = iri.substring(
                                  0,
                                  iri.lastIndexOf(selectedClass.name),
                                );
                                setAssertionClassNamespace(namespace);
                              }
                            }}
                            className="w-full px-3 py-2 border rounded-md text-gray-900"
                          >
                            <option value="">Select a class...</option>
                            {entitiesData?.classes.map((cls) => (
                              <option key={cls.iri} value={cls.name}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {selectedAxiomType === "object-property-assertion" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject (Individual)
                          </label>
                          <select
                            value={subjectIri}
                            onChange={(e) => setSubjectIri(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-gray-900"
                          >
                            <option value="">Select subject...</option>
                            {entitiesData?.individuals.map((ind) => (
                              <option key={ind.iri} value={ind.iri}>
                                {ind.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Object Property
                          </label>
                          <select
                            value={opPropertyName}
                            onChange={(e) => {
                              const selectedProp =
                                entitiesData?.object_properties.find(
                                  (p) => p.name === e.target.value,
                                );
                              setOpPropertyName(e.target.value);
                              if (selectedProp) {
                                const iri = selectedProp.iri;
                                const namespace = iri.substring(
                                  0,
                                  iri.lastIndexOf(selectedProp.name),
                                );
                                setOpPropertyNamespace(namespace);
                              }
                            }}
                            className="w-full px-3 py-2 border rounded-md text-gray-900"
                          >
                            <option value="">Select property...</option>
                            {entitiesData?.object_properties.map((prop) => (
                              <option key={prop.iri} value={prop.name}>
                                {prop.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Object (Individual)
                          </label>
                          <select
                            value={objectIri}
                            onChange={(e) => setObjectIri(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-gray-900"
                          >
                            <option value="">Select object...</option>
                            {entitiesData?.individuals.map((ind) => (
                              <option key={ind.iri} value={ind.iri}>
                                {ind.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {selectedAxiomType === "data-property-assertion" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subject (Individual)
                          </label>
                          <select
                            value={dpSubjectIri}
                            onChange={(e) => setDpSubjectIri(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-gray-900"
                          >
                            <option value="">Select individual...</option>
                            {entitiesData?.individuals.map((ind) => (
                              <option key={ind.iri} value={ind.iri}>
                                {ind.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data Property
                          </label>
                          <select
                            value={dpPropertyName}
                            onChange={(e) => {
                              const selectedProp =
                                entitiesData?.data_properties.find(
                                  (p) => p.name === e.target.value,
                                );
                              setDpPropertyName(e.target.value);
                              if (selectedProp) {
                                const iri = selectedProp.iri;
                                const namespace = iri.substring(
                                  0,
                                  iri.lastIndexOf(selectedProp.name),
                                );
                                setDpPropertyNamespace(namespace);
                              }
                            }}
                            className="w-full px-3 py-2 border rounded-md text-gray-900"
                          >
                            <option value="">Select property...</option>
                            {entitiesData?.data_properties.map((prop) => (
                              <option key={prop.iri} value={prop.name}>
                                {prop.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Literal Value
                          </label>
                          <input
                            type="text"
                            value={literalValue}
                            onChange={(e) => setLiteralValue(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-500"
                            placeholder="25"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Datatype (optional)
                          </label>
                          <input
                            type="text"
                            value={literalDatatype}
                            onChange={(e) => setLiteralDatatype(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-500"
                            placeholder="http://www.w3.org/2001/XMLSchema#integer"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Language (optional)
                          </label>
                          <input
                            type="text"
                            value={literalLang}
                            onChange={(e) => setLiteralLang(e.target.value)}
                            className="w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-500"
                            placeholder="en"
                          />
                        </div>
                      </>
                    )}

                    {selectedAxiomType === "subclass-of" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subclass
                          </label>
                          <select
                            value={subclassName}
                            onChange={(e) => {
                              const selectedClass = entitiesData?.classes.find(
                                (c) => c.name === e.target.value,
                              );
                              setSubclassName(e.target.value);
                              if (selectedClass) {
                                const iri = selectedClass.iri;
                                const namespace = iri.substring(
                                  0,
                                  iri.lastIndexOf(selectedClass.name),
                                );
                                setSubclassNamespace(namespace);
                              }
                            }}
                            className="w-full px-3 py-2 border rounded-md text-gray-900"
                          >
                            <option value="">Select subclass...</option>
                            {entitiesData?.classes.map((cls) => (
                              <option key={cls.iri} value={cls.name}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Superclass
                          </label>
                          <select
                            value={superclassName}
                            onChange={(e) => {
                              const selectedClass = entitiesData?.classes.find(
                                (c) => c.name === e.target.value,
                              );
                              setSuperclassName(e.target.value);
                              if (selectedClass) {
                                const iri = selectedClass.iri;
                                const namespace = iri.substring(
                                  0,
                                  iri.lastIndexOf(selectedClass.name),
                                );
                                setSuperclassNamespace(namespace);
                              }
                            }}
                            className="w-full px-3 py-2 border rounded-md text-gray-900"
                          >
                            <option value="">Select superclass...</option>
                            {entitiesData?.classes.map((cls) => (
                              <option key={cls.iri} value={cls.name}>
                                {cls.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    <button
                      onClick={handleAddAxiom}
                      disabled={
                        addClassMutation.isPending ||
                        addObjectPropertyMutation.isPending ||
                        addDataPropertyMutation.isPending ||
                        addIndividualMutation.isPending ||
                        addClassAssertionMutation.isPending ||
                        addObjectPropertyAssertionMutation.isPending ||
                        addDataPropertyAssertionMutation.isPending ||
                        addSubclassOfMutation.isPending
                      }
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 font-medium"
                    >
                      {addClassMutation.isPending ||
                      addObjectPropertyMutation.isPending ||
                      addDataPropertyMutation.isPending ||
                      addIndividualMutation.isPending ||
                      addClassAssertionMutation.isPending ||
                      addObjectPropertyAssertionMutation.isPending ||
                      addDataPropertyAssertionMutation.isPending ||
                      addSubclassOfMutation.isPending
                        ? "Adding..."
                        : "Add Axiom"}
                    </button>
                  </div>
                </>
              )}
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

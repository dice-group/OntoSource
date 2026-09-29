"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import createOntologyEntitiesQueryOptions from "../../queryOptions/createOntologyEntitiesQueryOptions";
import { api } from "../../lib/api";
import Button from "../ui/Button";
import ResultGraph from "../viszualisation/ResultGraph";
import type { Triple } from "../../store/ontology-store";
import type { NodeType } from "../../utils/graph-utils";

export type ReasoningTool =
  "hierarchy" | "types" | "consistency" | "expression";
const control = "w-full border border-slate-300 bg-white px-3 py-2 text-sm";
type Result = {
  super_classes?: { name: string; iri: string | null }[];
  sub_classes?: { name: string; iri: string | null }[];
  types?: { name: string; iri: string | null }[];
  consistent?: boolean;
  dl?: string;
  manchester?: string;
  sparql?: string;
};

export default function ReasoningTools({
  ontologyId,
  tool,
}: {
  ontologyId: string;
  tool: ReasoningTool;
}) {
  const { data: entities } = useQuery(
    createOntologyEntitiesQueryOptions(ontologyId),
  );
  const [entity, setEntity] = useState("");
  const [engine, setEngine] = useState("rdflib");
  const [direction, setDirection] = useState("super-classes");
  const [direct, setDirect] = useState(false);
  const [syntax, setSyntax] = useState("manchester");
  const [expression, setExpression] = useState("");
  const [timeout, setTimeout] = useState(60);
  const mutation = useMutation({
    mutationFn: () => {
      const operation = tool === "hierarchy" ? direction : tool;
      const body =
        tool === "consistency"
          ? { sync_reasoner_name: "HermiT", timeout }
          : tool === "expression"
            ? { class_expression: expression, syntax }
            : {
                reasoner_type: engine,
                ...(tool === "types"
                  ? { individual_iri: entity }
                  : { class_iri: entity }),
                direct,
              };
      return api<Result>(`reasoning/${ontologyId}/${operation}`, body);
    },
  });
  const labels = {
    hierarchy: "Class hierarchy",
    types: "Individual types",
    consistency: "Ontology consistency",
    expression: "Expression converter",
  };
  const rows =
    mutation.data?.super_classes ||
    mutation.data?.sub_classes ||
    mutation.data?.types;
  const resultTriples = useMemo<Triple[]>(
    () =>
      (rows || [])
        .filter((row) => row.iri)
        .map((row) => ({
          s:
            tool === "hierarchy" && direction === "sub-classes"
              ? row.iri!
              : entity,
          p:
            tool === "types"
              ? "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
              : "http://www.w3.org/2000/01/rdf-schema#subClassOf",
          o:
            tool === "hierarchy" && direction === "sub-classes"
              ? entity
              : row.iri!,
        })),
    [rows, tool, direction, entity],
  );
  const nodeTypes = useMemo<Record<string, NodeType>>(
    () =>
      Object.fromEntries([
        [entity, tool === "types" ? "individual" : "class"],
        ...(rows || [])
          .filter((row) => row.iri)
          .map((row) => [row.iri!, "class"]),
      ]),
    [entity, rows, tool],
  );
  return (
    <div className="dashboard-workspace">
      <section className="surface-panel tool-panel space-y-4">
        <h2>{labels[tool]}</h2>
        {(tool === "hierarchy" || tool === "types") && (
          <>
            <label className="block text-sm font-medium space-y-2">
              <span>{tool === "types" ? "Individual" : "Class"}</span>
              <select
                aria-label={tool === "types" ? "Individual" : "Class"}
                value={entity}
                onChange={(e) => {
                  setEntity(e.target.value);
                  mutation.reset();
                }}
                className={control}
              >
                <option value="">
                  Choose {tool === "types" ? "an individual" : "a class"}…
                </option>
                {(tool === "types"
                  ? entities?.individuals
                  : entities?.classes
                )?.map((item) => (
                  <option key={item.iri} value={item.iri}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {tool === "hierarchy" && (
              <label className="block text-sm font-medium space-y-2">
                <span>Relationship</span>
                <select
                  aria-label="Relationship"
                  className={control}
                  value={direction}
                  onChange={(e) => {
                    setDirection(e.target.value);
                    mutation.reset();
                  }}
                >
                  <option value="super-classes">Superclasses</option>
                  <option value="sub-classes">Subclasses</option>
                </select>
              </label>
            )}
            <label className="block text-sm font-medium space-y-2">
              <span>Reasoner</span>
              <select
                aria-label="Reasoner"
                className={control}
                value={engine}
                onChange={(e) => {
                  setEngine(e.target.value);
                  mutation.reset();
                }}
              >
                <option value="rdflib">RDFLib</option>
                <option value="structural">Structural (legacy)</option>
                <option value="sync">HermiT</option>
              </select>
            </label>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={direct}
                onChange={(e) => {
                  setDirect(e.target.checked);
                  mutation.reset();
                }}
              />
              Direct relationships only
            </label>
          </>
        )}
        {tool === "consistency" && (
          <>
            <p className="text-sm text-slate-500">
              Check whether the ontology’s axioms can all hold together. Uses
              the HermiT OWL reasoner.
            </p>
            <label className="block text-sm font-medium space-y-2">
              <span>Timeout (seconds)</span>
              <input
                type="number"
                min={1}
                max={300}
                value={timeout}
                onChange={(e) => setTimeout(Number(e.target.value))}
                className={control}
              />
            </label>
          </>
        )}
        {tool === "expression" && (
          <>
            <p className="text-sm text-slate-500">
              Convert a class expression into DL, Manchester syntax, and a
              SPARQL query.
            </p>
            <label className="block text-sm font-medium space-y-2">
              <span>Input syntax</span>
              <select
                aria-label="Input syntax"
                className={control}
                value={syntax}
                onChange={(e) => {
                  setSyntax(e.target.value);
                  mutation.reset();
                }}
              >
                <option value="manchester">Manchester</option>
                <option value="dl">DL</option>
                <option value="iri">Class IRI</option>
              </select>
            </label>
            <label className="block text-sm font-medium space-y-2">
              <span>Expression</span>
              <textarea
                aria-label="Expression"
                className={`${control} font-mono`}
                rows={4}
                value={expression}
                onChange={(e) => {
                  setExpression(e.target.value);
                  mutation.reset();
                }}
                placeholder="Person and (hasChild some Person)"
              />
            </label>
          </>
        )}
        <Button
          loading={mutation.isPending}
          disabled={
            !ontologyId ||
            ((tool === "hierarchy" || tool === "types") && !entity) ||
            (tool === "expression" && !expression.trim()) ||
            (tool === "consistency" && (timeout < 1 || timeout > 300))
          }
          onClick={() => mutation.mutate()}
        >
          {tool === "expression"
            ? "Convert expression"
            : tool === "consistency"
              ? "Check consistency"
              : "Run query"}
        </Button>
      </section>
      <section className="surface-panel tool-panel" aria-live="polite">
        <h2>Results {rows ? `· ${rows.length}` : ""}</h2>
        {mutation.isPending ? (
          <p className="text-sm text-slate-500">Running query…</p>
        ) : mutation.error ? (
          <p role="alert" className="text-sm text-red-700">
            {mutation.error.message}
          </p>
        ) : mutation.data ? (
          <>
            {rows &&
              (rows.length ? (
                <ResultGraph triples={resultTriples} nodeTypes={nodeTypes}>
                  <div className="divide-y divide-slate-200 max-h-[520px] overflow-auto">
                    {rows.map((row, i) => (
                      <div key={row.iri || i} className="py-3">
                        <p className="text-sm font-medium">{row.name}</p>
                        <p className="text-xs font-mono text-slate-500 break-all">
                          {row.iri}
                        </p>
                      </div>
                    ))}
                  </div>
                </ResultGraph>
              ) : (
                <p className="text-sm text-slate-500">
                  No matching relationships found.
                </p>
              ))}
            {mutation.data.consistent !== undefined && (
              <p
                className={`text-sm ${mutation.data.consistent ? "text-primary" : "text-red-700"}`}
              >
                {mutation.data.consistent
                  ? "Consistent: no conflicting axioms found."
                  : "Inconsistent: the ontology contains conflicting axioms."}
              </p>
            )}
            {(["dl", "manchester", "sparql"] as const).map(
              (key) =>
                mutation.data?.[key] && (
                  <div key={key} className="mb-5">
                    <h3 className="text-xs font-semibold uppercase mb-2">
                      {key}
                    </h3>
                    <pre className="text-xs font-mono whitespace-pre-wrap break-all bg-slate-50 p-3 rounded-md">
                      {mutation.data[key]}
                    </pre>
                  </div>
                ),
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">
            Run this tool to inspect the selected ontology.
          </p>
        )}
      </section>
    </div>
  );
}

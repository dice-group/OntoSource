"use client";

import { useCallback } from "react";
import {
  useOntologies,
  useSelectedOntologyId,
  useSetSelectedOntology,
  useRemoveOntology,
  OntologySummary,
} from "../../store/ontology-store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Ontology } from "../../store/ontology-store";
import createSummaryAllQueryOptions from "../../queryOptions/createSummaryAllQueryOptions";
import createDeleteOntologyMutationOptions from "../../mutationOptions/createDeleteOntologyMutationOptions";
import { Trash2 } from "lucide-react";

interface OntologyItemProps {
  id: string;
  filename: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  ontology_summary: OntologySummary;
}

function OntologyItem({
  id,
  filename,
  isSelected,
  onSelect,
  ontology_summary,
}: OntologyItemProps) {
  const { mutate } = useMutation(createDeleteOntologyMutationOptions());

  return (
    <div
      className={[
        "rounded-xl border p-3 cursor-pointer transition-all duration-150 group",
        isSelected
          ? "border-[#3B78B8] bg-[#EBF3FC] shadow-sm"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
      ].join(" ")}
      onClick={() => onSelect(id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isSelected && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#3B78B8] shrink-0" />
            )}
            <p className="text-sm font-semibold text-slate-800 break-all">{filename}</p>
          </div>
          <p className="text-xs text-slate-400 font-mono break-all mb-2" title={id}>
            {id}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {[
              { label: "Classes", value: ontology_summary.classes },
              {
                label: "Props",
                value: ontology_summary.object_properties + ontology_summary.data_properties,
              },
              { label: "Individuals", value: ontology_summary.individuals },
              { label: "Triples", value: ontology_summary.triples },
            ].map(({ label, value }) => (
              <span key={label} className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">{value}</span>{" "}
                {label}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            mutate(id);
          }}
          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete ontology"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function OntologyList() {
  const selectedId = useSelectedOntologyId();
  const setSelectedOntology = useSetSelectedOntology();

  const { data, isPending, error } = useQuery(createSummaryAllQueryOptions());

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedOntology(selectedId === id ? null : id);
    },
    [selectedId, setSelectedOntology],
  );

  if (isPending) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-slate-900">Loaded Ontologies</h2>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
          <div className="animate-spin h-4 w-4 rounded-full border-2 border-slate-200 border-t-[#3B78B8]" />
          Loading…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Loaded Ontologies</h2>
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
          {error.message}
        </p>
      </div>
    );
  }

  if (!data?.summary || data.summary.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Loaded Ontologies</h2>
        <p className="text-xs text-slate-400 text-center py-4">
          No ontologies loaded yet.
          <br />
          Upload a file to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Loaded Ontologies
        </h2>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#EBF3FC] text-[#2A5988]">
          {data.summary.length}
        </span>
      </div>
      <div className="p-3 space-y-2 max-h-[420px] overflow-y-auto">
        {data.summary.map((ontology: Ontology) => (
          <OntologyItem
            key={ontology.id}
            id={ontology.id}
            filename={ontology.filename}
            ontology_summary={ontology.summary}
            isSelected={selectedId === ontology.id}
            onSelect={handleSelect}
          />
        ))}
      </div>
      <p className="text-xs text-slate-400 text-center pb-3 px-3">
        Click an ontology to view its graph
      </p>
    </div>
  );
}

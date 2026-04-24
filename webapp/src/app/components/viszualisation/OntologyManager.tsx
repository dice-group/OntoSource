"use client";

import { useSelectedOntologyId } from "../../store/ontology-store";
import FileUpload from "./FileUpload";
import OntologyList from "./OntologyList";
import KnowledgeGraph from "./KnowledgeGraph";
import { useQuery } from "@tanstack/react-query";
import createSummaryQueryOptions from "../../queryOptions/createSummaryQueryOptions";
import { Tag } from "lucide-react";

export default function OntologyManager() {
  const selectedId = useSelectedOntologyId();

  const { data } = useQuery({
    ...createSummaryQueryOptions(selectedId || ""),
    enabled: !!selectedId,
  });

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 py-8">
      <div className="w-full lg:w-3/4 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Knowledge Graph Visualization
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload ontology files and explore their knowledge graphs interactively
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Upload Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Upload
              </p>
              <FileUpload />
            </div>

            {/* List */}
            <OntologyList />
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Namespace pill */}
            {selectedId && data?.ontology_iri && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-[#3B78B8] shrink-0" />
                <span className="text-xs font-medium text-slate-500 shrink-0">
                  Namespace:
                </span>
                <code className="text-xs text-slate-700 font-mono truncate">
                  {data.ontology_iri}
                </code>
              </div>
            )}

            <KnowledgeGraph ontologyId={selectedId} />
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          Supports OWL, RDF, TTL, N3, and NT formats
        </p>
      </div>
    </div>
  );
}

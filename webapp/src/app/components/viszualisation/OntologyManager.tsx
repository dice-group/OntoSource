"use client";

import { useSelectedOntologyId } from "../../store/ontology-store";
import FileUpload from "./FileUpload";
import OntologyList from "./OntologyList";
import KnowledgeGraph from "./KnowledgeGraph";
import { useQuery } from "@tanstack/react-query";
import createSummaryQueryOptions from "../../queryOptions/createSummaryQueryOptions";
import PageHeader from "../ui/PageHeader";
import { Tag } from "lucide-react";

export default function OntologyManager() {
  const selectedId = useSelectedOntologyId();

  const { data } = useQuery({
    ...createSummaryQueryOptions(selectedId || ""),
    enabled: !!selectedId,
  });

  return (
    <div className="workspace-page">
      <div className="workspace-content workspace-content-wide">
        <PageHeader title="Knowledge Graph Visualization" description="Upload ontology files and explore their knowledge graphs interactively" />

        <div className="visualization-layout">
          {/* Left Panel */}
          <div className="ontology-sidebar space-y-5">
            {/* Upload Card */}
            <div className="upload-panel">
              <p className="text-sm font-semibold text-slate-800 mb-3">
                Upload
              </p>
              <FileUpload />
            </div>

            {/* List */}
            <OntologyList />
          </div>

          {/* Right Panel */}
          <div className="graph-workspace flex flex-col gap-4">
            {/* Namespace pill */}
            {selectedId && data?.ontology_iri && (
              <div className="surface-panel px-4 py-3 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
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

        <p className="mt-5 text-xs text-slate-500">
          Supports OWL, RDF, TTL, N3, and NT formats
        </p>
      </div>
    </div>
  );
}

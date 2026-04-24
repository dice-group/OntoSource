import { mutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createGenerateOntologyMutationOptions() {
  return mutationOptions({
    mutationFn: startGenerateOntology,
    onError: (error: Error) => {
      toast.error(error.message || "Failed to start ontology generation");
    },
  });
}

export type GenerateOntologyRequest = {
  text: string;
  model_name?: string;
  api_key: string;
  api_base?: string;
  ontology_namespace?: string;
  filename?: string;
  ontology_type?: "domain" | "open";
  query?: string | null;
  domain?: string | null;
  entity_types?: string[] | null;
  generate_types?: boolean;
  extract_spl_triples?: boolean;
  create_class_hierarchy?: boolean;
  entity_clustering?: boolean;
  use_chunking?: boolean | null;
  use_incremental_merging?: boolean;
  fact_reassurance?: boolean;
  temperature?: number;
  seed?: number;
  cache?: boolean;
  enable_logging?: boolean;
  max_tokens?: number;
  chunk_size?: number | null;
  overlap?: number | null;
  chunking_strategy?: string | null;
  auto_chunk_threshold?: number | null;
};

export type GenerateOntologyJobResponse = {
  job_id: string;
  status: string;
  message: string;
};

const startGenerateOntology = async (
  request: GenerateOntologyRequest,
): Promise<GenerateOntologyJobResponse> => {
  const response = await fetch("/api/generate/generate_ontology", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to start ontology generation");
  }
  return response.json();
};


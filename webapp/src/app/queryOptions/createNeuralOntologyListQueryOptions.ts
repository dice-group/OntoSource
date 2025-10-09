import { queryOptions } from "@tanstack/react-query";

export interface NeuralOntologyInfo {
  neural_ontology_id: string;
  ontology_id: string;
}

export interface NeuralOntologyListResponse {
  neural_ontologies: NeuralOntologyInfo[];
}

export const createNeuralOntologyListQueryOptions = () => {
  return queryOptions<NeuralOntologyListResponse>({
    queryKey: ["neural-ontologies"],
    queryFn: getNeuralOntologyList,
  });
};

const getNeuralOntologyList = async () => {
  const response = await fetch("/api/neural-reasoning/list");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to list neural ontologies");
  }

  return response.json();
};



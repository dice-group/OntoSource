import { queryOptions } from "@tanstack/react-query";

export interface IndividualItem {
  iri: string;
  name: string;
}

export interface NeuralInstancesRequest {
  class_expression: string;
  syntax?: "iri" | "dl" | "manchester";
}

export interface NeuralInstancesResponse {
  neural_ontology_id: string;
  class_expression: string;
  individuals: IndividualItem[];
}

export const createNeuralInstancesQueryOptions = (
  neuralOntologyId: string,
  request: NeuralInstancesRequest,
  enabled: boolean = true,
) => {
  return queryOptions<NeuralInstancesResponse>({
    queryKey: ["neural-instances", neuralOntologyId, request],
    queryFn: () => getNeuralInstances(neuralOntologyId, request),
    enabled,
  });
};

const getNeuralInstances = async (neuralOntologyId: string, request: NeuralInstancesRequest) => {
  const response = await fetch(
    `/api/neural-reasoning/${neuralOntologyId}/instances`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get neural instances");
  }

  return response.json();
};


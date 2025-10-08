import { useMutation } from "@tanstack/react-query";
//TODO: fix pattern here
export interface CreateNeuralOntologyRequest {
  ontology_id: string;
  path_neural_embedding?: string;
  retrain?: boolean;
}

export interface CreateNeuralOntologyResponse {
  neural_ontology_id: string;
  ontology_id: string;
  message: string;
}

export const createNeuralOntologyMutationOptions = () => {
  return {
    mutationFn: async (
      request: CreateNeuralOntologyRequest,
    ): Promise<CreateNeuralOntologyResponse> => {
      const response = await fetch("/api/neural-reasoning/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create neural ontology");
      }

      return response.json();
    },
  };
};

export const useCreateNeuralOntology = () => {
  return useMutation(createNeuralOntologyMutationOptions());
};


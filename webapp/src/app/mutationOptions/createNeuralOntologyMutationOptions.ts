import { mutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createNeuralOntologyMutationOptions() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: createNeuralOntology,
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast.success(data.message || "Neural ontology created successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create neural ontology");
    },
  });
}

type CreateNeuralOntologyRequest = {
  ontology_id: string;
  path_neural_embedding?: string;
  retrain?: boolean;
};

type CreateNeuralOntologyResponse = {
  neural_ontology_id: string;
  ontology_id: string;
  message: string;
};

const createNeuralOntology = async (
  request: CreateNeuralOntologyRequest,
): Promise<CreateNeuralOntologyResponse> => {
  const response = await fetch("/api/neural-reasoning/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to create neural ontology");
  }
  return response.json();
};


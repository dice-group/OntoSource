import { mutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createNeuralOntologyMutationOptions() {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: createNeuralOntology,
    onSuccess: (data) => {
      // Job started successfully - don't show final success yet
      toast.info(data.message || "Neural ontology creation started...");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to start neural ontology creation");
    },
  });
}

type CreateNeuralOntologyRequest = {
  ontology_id: string;
  path_neural_embedding?: string;
  retrain?: boolean;
};

type CreateNeuralOntologyResponse = {
  job_id: string;
  status: string;
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


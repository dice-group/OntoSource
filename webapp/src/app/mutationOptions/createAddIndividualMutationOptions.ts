import { invalidateOntologyQueries } from "../lib/ontology-cache";
import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createAddIndividualMutationOptions(
  queryClient: QueryClient,
  ontologyId: string,
) {
  return mutationOptions({
    mutationFn: (payload: AddIndividualPayload) =>
      addIndividual(ontologyId, payload),
    onSuccess: (data) => {
      invalidateOntologyQueries(queryClient, ontologyId);
      toast.success(data.message || "Individual added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add individual");
    },
  });
}

type AddIndividualPayload = {
  namespace: string;
  class_name: string;
};

type OperationResponse = {
  success: boolean;
  message: string;
};

const addIndividual = async (
  ontologyId: string,
  payload: AddIndividualPayload,
): Promise<OperationResponse> => {
  const response = await fetch(`/api/modify/${ontologyId}/individual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to add individual");
  }
  return response.json();
};

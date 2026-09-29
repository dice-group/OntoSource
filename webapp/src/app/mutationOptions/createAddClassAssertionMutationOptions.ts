import { invalidateOntologyQueries } from "../lib/ontology-cache";
import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createAddClassAssertionMutationOptions(
  queryClient: QueryClient,
  ontologyId: string,
) {
  return mutationOptions({
    mutationFn: (payload: AddClassAssertionPayload) =>
      addClassAssertion(ontologyId, payload),
    onSuccess: (data) => {
      invalidateOntologyQueries(queryClient, ontologyId);
      toast.success(data.message || "Class assertion added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add class assertion");
    },
  });
}

type AddClassAssertionPayload = {
  individual_iri: string;
  class_name: string;
  class_namespace: string;
};

type OperationResponse = {
  success: boolean;
  message: string;
};

const addClassAssertion = async (
  ontologyId: string,
  payload: AddClassAssertionPayload,
): Promise<OperationResponse> => {
  const response = await fetch(`/api/modify/${ontologyId}/class-assertion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to add class assertion");
  }
  return response.json();
};

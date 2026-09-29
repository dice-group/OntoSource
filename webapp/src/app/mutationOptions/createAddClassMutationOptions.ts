import { invalidateOntologyQueries } from "../lib/ontology-cache";
import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createAddClassMutationOptions(
  queryClient: QueryClient,
  ontologyId: string,
) {
  return mutationOptions({
    mutationFn: (payload: AddClassPayload) => addClass(ontologyId, payload),
    onSuccess: (data) => {
      invalidateOntologyQueries(queryClient, ontologyId);
      toast.success(data.message || "Class added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add class");
    },
  });
}

type AddClassPayload = {
  namespace: string;
  class_name: string;
};

type OperationResponse = {
  success: boolean;
  message: string;
};

const addClass = async (
  ontologyId: string,
  payload: AddClassPayload,
): Promise<OperationResponse> => {
  const response = await fetch(`/api/modify/${ontologyId}/class`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to add class");
  }
  return response.json();
};

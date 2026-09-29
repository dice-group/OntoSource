import { invalidateOntologyQueries } from "../lib/ontology-cache";
import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createAddObjectPropertyMutationOptions(
  queryClient: QueryClient,
  ontologyId: string,
) {
  return mutationOptions({
    mutationFn: (payload: AddObjectPropertyPayload) =>
      addObjectProperty(ontologyId, payload),
    onSuccess: (data) => {
      invalidateOntologyQueries(queryClient, ontologyId);
      toast.success(data.message || "Object property added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add object property");
    },
  });
}

type AddObjectPropertyPayload = {
  namespace: string;
  property_name: string;
};

type OperationResponse = {
  success: boolean;
  message: string;
};

const addObjectProperty = async (
  ontologyId: string,
  payload: AddObjectPropertyPayload,
): Promise<OperationResponse> => {
  const response = await fetch(`/api/modify/${ontologyId}/object-property`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to add object property");
  }
  return response.json();
};

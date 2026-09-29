import { invalidateOntologyQueries } from "../lib/ontology-cache";
import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createAddDataPropertyMutationOptions(
  queryClient: QueryClient,
  ontologyId: string,
) {
  return mutationOptions({
    mutationFn: (payload: AddDataPropertyPayload) =>
      addDataProperty(ontologyId, payload),
    onSuccess: (data) => {
      invalidateOntologyQueries(queryClient, ontologyId);
      toast.success(data.message || "Data property added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add data property");
    },
  });
}

type AddDataPropertyPayload = {
  namespace: string;
  property_name: string;
};

type OperationResponse = {
  success: boolean;
  message: string;
};

const addDataProperty = async (
  ontologyId: string,
  payload: AddDataPropertyPayload,
): Promise<OperationResponse> => {
  const response = await fetch(`/api/modify/${ontologyId}/data-property`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to add data property");
  }
  return response.json();
};

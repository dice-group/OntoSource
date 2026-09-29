import { invalidateOntologyQueries } from "../lib/ontology-cache";
import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createAddObjectPropertyAssertionMutationOptions(
  queryClient: QueryClient,
  ontologyId: string,
) {
  return mutationOptions({
    mutationFn: (payload: AddObjectPropertyAssertionPayload) =>
      addObjectPropertyAssertion(ontologyId, payload),
    onSuccess: (data) => {
      invalidateOntologyQueries(queryClient, ontologyId);
      toast.success(
        data.message || "Object property assertion added successfully!",
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add object property assertion");
    },
  });
}

type AddObjectPropertyAssertionPayload = {
  subject_iri: string;
  object_iri: string;
  property_name: string;
  property_namespace: string;
};

type OperationResponse = {
  success: boolean;
  message: string;
};

const addObjectPropertyAssertion = async (
  ontologyId: string,
  payload: AddObjectPropertyAssertionPayload,
): Promise<OperationResponse> => {
  const response = await fetch(
    `/api/modify/${ontologyId}/object-property-assertion`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error || "Failed to add object property assertion",
    );
  }
  return response.json();
};

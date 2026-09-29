import { invalidateOntologyQueries } from "../lib/ontology-cache";
import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createAddDataPropertyAssertionMutationOptions(
  queryClient: QueryClient,
  ontologyId: string,
) {
  return mutationOptions({
    mutationFn: (payload: AddDataPropertyAssertionPayload) =>
      addDataPropertyAssertion(ontologyId, payload),
    onSuccess: (data) => {
      invalidateOntologyQueries(queryClient, ontologyId);
      toast.success(
        data.message || "Data property assertion added successfully!",
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add data property assertion");
    },
  });
}

type AddDataPropertyAssertionPayload = {
  subject_iri: string;
  property_name: string;
  property_namespace: string;
  literal: {
    value: string | number;
    datatype: string | null;
    lang: string | null;
  };
};

type OperationResponse = {
  success: boolean;
  message: string;
};

const addDataPropertyAssertion = async (
  ontologyId: string,
  payload: AddDataPropertyAssertionPayload,
): Promise<OperationResponse> => {
  const response = await fetch(
    `/api/modify/${ontologyId}/data-property-assertion`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to add data property assertion");
  }
  return response.json();
};

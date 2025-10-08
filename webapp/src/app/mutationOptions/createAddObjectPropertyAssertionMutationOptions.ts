import { mutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import createSummaryAllQueryOptions from "../queryOptions/createSummaryAllQueryOptions";
import { toast } from "sonner";

export default function createAddObjectPropertyAssertionMutationOptions(ontologyId: string) {
  const queryClient = useQueryClient()
  return mutationOptions({
    mutationFn: (payload: AddObjectPropertyAssertionPayload) => addObjectPropertyAssertion(ontologyId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries()
      toast.success(data.message || "Object property assertion added successfully!")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add object property assertion")
    }
  })
}

type AddObjectPropertyAssertionPayload = {
  subject_iri: string
  object_iri: string
  property_name: string
  property_namespace: string
}

type OperationResponse = {
  success: boolean
  message: string
}

const addObjectPropertyAssertion = async (ontologyId: string, payload: AddObjectPropertyAssertionPayload): Promise<OperationResponse> => {
  const response = await fetch(`/api/modify/${ontologyId}/object-property-assertion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to add object property assertion')
  }
  return response.json()
}


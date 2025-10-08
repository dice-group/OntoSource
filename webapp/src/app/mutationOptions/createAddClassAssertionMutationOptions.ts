import { mutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import createSummaryAllQueryOptions from "../queryOptions/createSummaryAllQueryOptions";
import createOntologyEntitiesQueryOptions from "../queryOptions/createOntologyEntitiesQueryOptions";
import { toast } from "sonner";

export default function createAddClassAssertionMutationOptions(ontologyId: string) {
  const queryClient = useQueryClient()
  return mutationOptions({
    mutationFn: (payload: AddClassAssertionPayload) => addClassAssertion(ontologyId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries()
      toast.success(data.message || "Class assertion added successfully!")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add class assertion")
    }
  })
}

type AddClassAssertionPayload = {
  individual_iri: string
  class_name: string
  class_namespace: string
}

type OperationResponse = {
  success: boolean
  message: string
}

const addClassAssertion = async (ontologyId: string, payload: AddClassAssertionPayload): Promise<OperationResponse> => {
  const response = await fetch(`/api/modify/${ontologyId}/class-assertion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to add class assertion')
  }
  return response.json()
}


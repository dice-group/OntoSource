import { mutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import createSummaryAllQueryOptions from "../queryOptions/createSummaryAllQueryOptions";
import { toast } from "sonner";

export default function createAddSubclassOfMutationOptions(ontologyId: string) {
  const queryClient = useQueryClient()
  return mutationOptions({
    mutationFn: (payload: AddSubclassOfPayload) => addSubclassOf(ontologyId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries()
      toast.success(data.message || "Subclass axiom added successfully!")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add subclass axiom")
    }
  })
}

type AddSubclassOfPayload = {
  subclass_name: string
  subclass_namespace: string
  superclass_name: string
  superclass_namespace: string
}

type OperationResponse = {
  success: boolean
  message: string
}

const addSubclassOf = async (ontologyId: string, payload: AddSubclassOfPayload): Promise<OperationResponse> => {
  const response = await fetch(`/api/modify/${ontologyId}/subclass-of`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to add subclass axiom')
  }
  return response.json()
}


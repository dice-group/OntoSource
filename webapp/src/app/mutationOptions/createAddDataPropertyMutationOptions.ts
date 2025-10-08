import { mutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import createSummaryAllQueryOptions from "../queryOptions/createSummaryAllQueryOptions";
import { toast } from "sonner";

export default function createAddDataPropertyMutationOptions(ontologyId: string) {
  const queryClient = useQueryClient()
  return mutationOptions({
    mutationFn: (payload: AddDataPropertyPayload) => addDataProperty(ontologyId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries()
      toast.success(data.message || "Data property added successfully!")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add data property")
    }
  })
}

type AddDataPropertyPayload = {
  namespace: string
  property_name: string
}

type OperationResponse = {
  success: boolean
  message: string
}

const addDataProperty = async (ontologyId: string, payload: AddDataPropertyPayload): Promise<OperationResponse> => {
  const response = await fetch(`/api/modify/${ontologyId}/data-property`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to add data property')
  }
  return response.json()
}


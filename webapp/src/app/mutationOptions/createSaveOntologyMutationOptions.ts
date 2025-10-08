import { mutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createSaveOntologyMutationOptions(ontologyId: string) {
  const queryClient = useQueryClient()
  return mutationOptions({
    mutationFn: (path: string) => saveOntology(ontologyId, path),
    onSuccess: (data) => {
      toast.success(data.message || "Ontology saved successfully!")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save ontology")
    }
  })
}

type OperationResponse = {
  success: boolean
  message: string
}

const saveOntology = async (ontologyId: string, path: string): Promise<OperationResponse> => {
  const response = await fetch(`/api/modify/${ontologyId}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  if (!response.ok) throw new Error('Failed to save ontology')
  return response.json()
}


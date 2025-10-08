import { mutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createDeleteOntologyMutationOptions() {
  const queryClient = useQueryClient()
  return mutationOptions({
    mutationFn: deleteOntology,
    onSuccess: () => {
      queryClient.invalidateQueries({refetchType: 'all'})
      toast.success("Ontology deleted successfully!")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete ontology")
    }
  })
}

const deleteOntology = async (id: string) => {
  const response = await fetch(`/api/ontology/${id}`, {
    method: 'DELETE',
  })
  return response.json()
}
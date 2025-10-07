import { mutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import createSummaryAllQueryOptions from "../queryOptions/createSummaryAllQueryOptions";

export default function createDeleteOntologyMutationOptions() {
  const queryClient = useQueryClient()
  return mutationOptions({
    mutationFn: deleteOntology,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createSummaryAllQueryOptions().queryKey })
    }
  })
}

const deleteOntology = async (id: string) => {
  const response = await fetch(`/api/ontology/${id}`, {
    method: 'DELETE',
  })
  return response.json()
}
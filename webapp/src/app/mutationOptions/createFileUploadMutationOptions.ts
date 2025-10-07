import { mutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import createSummaryAllQueryOptions from "../queryOptions/createSummaryAllQueryOptions";

export default function createFileUploadMutationOptions() {
  const queryClient = useQueryClient()
  return mutationOptions({
    mutationFn: uploadOntology,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: createSummaryAllQueryOptions().queryKey })
    }
  })
}

const uploadOntology = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/ontology/upload', {
    method: 'POST',
    body: formData,
  })

  return response.json()
}

import { mutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import createSummaryAllQueryOptions from "../queryOptions/createSummaryAllQueryOptions";
import { toast } from "sonner";

export default function createFileUploadMutationOptions() {
  const queryClient = useQueryClient()
  return mutationOptions({
    mutationFn: uploadOntology,
    onSuccess: () => {
      queryClient.invalidateQueries()
      toast.success("Ontology file uploaded successfully!")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload ontology file")
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

import { mutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import createSummaryAllQueryOptions from "../queryOptions/createSummaryAllQueryOptions";
import { toast } from "sonner";

export default function createCreateOntologyMutationOptions() {
  const queryClient = useQueryClient()
  return mutationOptions({
    mutationFn: createOntology,
    onSuccess: (data) => {
      queryClient.invalidateQueries()
      toast.success(`Ontology "${data.filename}" created successfully!`)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create ontology")
    }
  })
}

type CreateOntologyParams = {
  ontology_iri: string
  filename: string
}

type CreateOntologyResponse = {
  id: string
  filename: string
  ontology_iri: string
}

const createOntology = async (data: CreateOntologyParams): Promise<CreateOntologyResponse> => {
  const response = await fetch('/api/modify/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create ontology')
  return response.json()
}


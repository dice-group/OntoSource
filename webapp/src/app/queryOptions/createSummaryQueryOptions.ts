import { queryOptions } from "@tanstack/react-query";

export default function createSummaryQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['ontology-summary', id],
    queryFn: () => getSummary(id), 
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always' // Refetch when component mounts
  })
}

const getSummary = async (id: string) => {
  const response = await fetch(`/api/ontology/${id}/summary`)
  return response.json()
}
import { Triple } from "@/app/store/ontology-store";
import { queryOptions } from "@tanstack/react-query";

export default function createGraphDataQueryOptions(id: string) {
  return queryOptions({
    queryKey: ['graph-data', id],
    queryFn: () => getGraphData(id),
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always' // Refetch when component mounts
  })
}

const getGraphData = async (id: string): Promise<GraphDataResponse> => {
  const response = await fetch(`/api/ontology/${id}/triples`)
  return response.json()
}

type GraphDataResponse = {
  triples: Triple[]
  total: number
}
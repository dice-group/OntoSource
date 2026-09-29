import { Triple } from "@/app/store/ontology-store";
import { queryOptions } from "@tanstack/react-query";

export default function createGraphDataQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["graph-data", id],
    queryFn: ({ signal }) => getGraphData(id, signal),
    staleTime: 60 * 1000, // 1 minute
    refetchOnMount: true,
    structuralSharing: false,
  });
}

const getGraphData = async (id: string, signal?: AbortSignal): Promise<GraphDataResponse> => {
  const response = await fetch(`/api/ontology/${id}/triples`, { signal });
  if (!response.ok) throw new Error("Failed to fetch graph data");
  return response.json();
};

type GraphDataResponse = {
  triples: Triple[];
  total: number;
};

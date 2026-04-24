import { Triple } from "@/app/store/ontology-store";
import { queryOptions } from "@tanstack/react-query";

export default function createGraphDataQueryOptions(id: string) {
  return queryOptions({
    queryKey: ["graph-data", id],
    queryFn: () => getGraphData(id),
    staleTime: 60 * 1000, // 1 minute
    refetchOnMount: "always", // Refetch when component mounts
  });
}

const getGraphData = async (id: string): Promise<GraphDataResponse> => {
  const response = await fetch(`/api/ontology/${id}/triples`);
  if (!response.ok) throw new Error("Failed to fetch graph data");
  return response.json();
};

type GraphDataResponse = {
  triples: Triple[];
  total: number;
};

import { queryOptions } from "@tanstack/react-query";

export type GenerateJobStatus = {
  status: "pending" | "processing" | "completed" | "failed";
  ontology_id: string | null;
  filename: string | null;
  ontology_iri: string | null;
  message: string | null;
  error: string | null;
};

export function createGenerateJobStatusQueryOptions(
  job_id: string,
  enabled: boolean = true
) {
  return queryOptions({
    queryKey: ["generate-job-status", job_id],
    queryFn: async (): Promise<GenerateJobStatus> => {
      const response = await fetch(
        `/api/generate/generate_ontology/status/${job_id}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch generation status");
      }
      return response.json();
    },
    enabled: enabled && !!job_id,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 2 seconds while pending or processing
      if (data?.status === "pending" || data?.status === "processing") {
        return 2000;
      }
      // Stop polling when completed or failed
      return false;
    },
    retry: 3,
    staleTime: 1000,
  });
}



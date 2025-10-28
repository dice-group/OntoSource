import { queryOptions } from "@tanstack/react-query";

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface NeuralJobStatusResponse {
  status: JobStatus;
  neural_ontology_id: string | null;
  ontology_id?: string;
  message: string | null;
  error: string | null;
}

export function createNeuralJobStatusQueryOptions(
  jobId: string,
  enabled: boolean = true
) {
  return queryOptions({
    queryKey: ["neural-job-status", jobId],
    queryFn: async (): Promise<NeuralJobStatusResponse> => {
      const response = await fetch(
        `/api/neural-reasoning/create/status/${jobId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch job status");
      }
      return response.json();
    },
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Poll every 2 seconds while job is pending or processing
      if (data?.status === "pending" || data?.status === "processing") {
        return 2000;
      }
      // Stop polling when completed or failed
      return false;
    },
    staleTime: 0, // Always fetch fresh data
  });
}



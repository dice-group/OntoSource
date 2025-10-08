import { mutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import createSummaryAllQueryOptions from "../queryOptions/createSummaryAllQueryOptions";
import { toast } from "sonner";

export default function createAddClassMutationOptions(ontologyId: string) {
  const queryClient = useQueryClient();
  return mutationOptions({
    mutationFn: (payload: AddClassPayload) => addClass(ontologyId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast.success(data.message || "Class added successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add class");
    },
  });
}

type AddClassPayload = {
  namespace: string;
  class_name: string;
};

type OperationResponse = {
  success: boolean;
  message: string;
};

const addClass = async (
  ontologyId: string,
  payload: AddClassPayload,
): Promise<OperationResponse> => {
  const response = await fetch(`/api/modify/${ontologyId}/class`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to add class");
  }
  return response.json();
};

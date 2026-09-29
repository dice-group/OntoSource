import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createDeleteOntologyMutationOptions(queryClient: QueryClient, onDeleted: (id: string) => void) {
  return mutationOptions({
    mutationFn: deleteOntology,
    onSuccess: (_data, id: string) => {
      onDeleted(id);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[1] === id });
      queryClient.invalidateQueries({ queryKey: ["ontology-summary-all"] });
      queryClient.invalidateQueries({ queryKey: ["neural-ontologies"] });

      toast.success("Ontology deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete ontology");
    },
  });
}

const deleteOntology = async (id: string) => {
  const response = await fetch(`/api/ontology/${id}`, {
    method: "DELETE",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Failed to delete ontology");
  return data;
};

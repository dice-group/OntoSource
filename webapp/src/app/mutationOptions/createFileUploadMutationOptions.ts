import { invalidateOntologyQueries } from "../lib/ontology-cache";
import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function createFileUploadMutationOptions(queryClient: QueryClient) {
  return mutationOptions({
    mutationFn: uploadOntology,
    onSuccess: () => {
      invalidateOntologyQueries(queryClient);
      toast.success("Ontology file uploaded successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to upload ontology file");
    },
  });
}

const uploadOntology = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/ontology/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Upload failed");
  }
  return data;
};

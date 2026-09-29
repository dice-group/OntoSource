"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import createFileUploadMutationOptions from "../../mutationOptions/createFileUploadMutationOptions";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useSetSelectedOntology } from "../../store/ontology-store";

interface FileUploadProps {
  onUploadSuccess?: () => void;
  onUploadError?: (error: string) => void;
}

export default function FileUpload({
  onUploadSuccess,
  onUploadError,
}: FileUploadProps) {
  const queryClient = useQueryClient();
  const setSelectedOntology = useSetSelectedOntology();
  const [dragOver, setDragOver] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  const { mutate, isPending: isUploading } = useMutation({
    ...createFileUploadMutationOptions(queryClient),
  });
  const isBusy = isUploading || isLoadingDemo;
  const upload = (file: File) => mutate(file, {
    onSuccess: () => onUploadSuccess?.(),
    onError: (error) => onUploadError?.(error.message),
  });

  const loadDemo = async () => {
    if (isBusy) return;
    setIsLoadingDemo(true);
    try {
      const response = await fetch("/examples/family.owl");
      if (!response.ok) throw new Error("Could not load the family demo. Please try again.");
      const file = new File([await response.blob()], "family.owl", { type: "application/rdf+xml" });
      mutate(file, {
        onSuccess: (data) => {
          setSelectedOntology(data.id);
          onUploadSuccess?.();
        },
        onError: (error) => onUploadError?.(error.message),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load the family demo. Please try again.";
      toast.error(message);
      onUploadError?.(message);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files)[0];
    if (file && !isBusy) upload(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !isBusy) upload(file);
    e.target.value = "";
  };

  return (
    <div
      className={[
        "upload-dropzone text-center transition-colors duration-200",
        dragOver
          ? "border-primary bg-primary-surface"
          : "border-slate-300 hover:border-primary/50 hover:bg-slate-50",
        isBusy ? "opacity-60 pointer-events-none" : "cursor-pointer",
      ].join(" ")}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
    >
      {isBusy ? (
        <div className="flex flex-col items-center gap-3" role="status">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-primary" />
          <p className="text-sm font-medium text-slate-600">{isLoadingDemo ? "Loading demo…" : "Uploading…"}</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <div className="upload-symbol">
              <UploadCloud className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-800 mb-1">
            Drop your ontology file here
          </p>
          <p className="text-xs text-slate-500 mb-4">
            OWL, RDF, TTL, N3, NT supported
          </p>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-primary">
            <input
              type="file"
              className="sr-only"
              accept=".owl,.rdf,.xml,.ttl,.n3,.nt"
              onChange={handleFileInput}
              disabled={isBusy}
            />
            Browse files
          </label>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <button type="button" onClick={loadDemo} disabled={isBusy} className="text-sm font-semibold text-primary hover:text-primary-dark underline underline-offset-4">
              Load family demo
            </button>
            <p className="mt-2 text-xs text-slate-500">Explore classes, family relationships, and reasoning.</p>
          </div>
        </>
      )}
    </div>
  );
}

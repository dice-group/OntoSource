"use client";

import { useCallback, useState } from "react";
import {
  useAddOntology,
  useSetOntologyError,
} from "../../store/ontology-store";
import { useMutation } from "@tanstack/react-query";
import createFileUploadMutationOptions from "../../mutationOptions/createFileUploadMutationOptions";
import { UploadCloud } from "lucide-react";

interface FileUploadProps {
  onUploadSuccess?: () => void;
  onUploadError?: (error: string) => void;
}

export default function FileUpload({
  onUploadSuccess,
  onUploadError,
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { mutate } = useMutation(createFileUploadMutationOptions());

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = Array.from(e.dataTransfer.files)[0];
    if (file) mutate(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) mutate(file);
  };

  return (
    <div
      className={[
        "rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200",
        dragOver
          ? "border-[#3B78B8] bg-[#EBF3FC]"
          : "border-slate-300 hover:border-[#3B78B8]/50 hover:bg-slate-50",
        isUploading ? "opacity-60 pointer-events-none" : "cursor-pointer",
      ].join(" ")}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
    >
      {isUploading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-[#3B78B8]" />
          <p className="text-sm font-medium text-slate-600">Uploading…</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#EBF3FC] flex items-center justify-center">
              <UploadCloud className="w-6 h-6 text-[#3B78B8]" />
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-800 mb-1">
            Drop your ontology file here
          </p>
          <p className="text-xs text-slate-500 mb-4">
            OWL, RDF, TTL, N3, NT supported
          </p>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#3B78B8] text-white hover:bg-[#2A5988] transition-colors shadow-sm">
            <input
              type="file"
              className="sr-only"
              accept=".owl,.rdf,.xml,.ttl,.n3,.nt"
              onChange={handleFileInput}
              disabled={isUploading}
            />
            Browse files
          </label>
        </>
      )}
    </div>
  );
}

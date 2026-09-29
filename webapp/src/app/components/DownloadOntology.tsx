"use client";
import { useState } from "react";
import { toast } from "sonner";
import Button from "./ui/Button";

export default function DownloadOntology({
  id,
  filename,
}: {
  id: string;
  filename: string;
}) {
  const [format, setFormat] = useState("xml");
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/ontology/${id}/download?format=${format}`,
      );
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Download failed");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download =
        filename.replace(/\.[^.]+$/, "") +
        ({ xml: ".owl", turtle: ".ttl", nt: ".nt" }[format] || ".owl");
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <label htmlFor="download-format" className="block text-sm font-medium">
        Download format
      </label>
      <select
        id="download-format"
        value={format}
        onChange={(event) => setFormat(event.target.value)}
        className="w-full border border-slate-300 bg-white px-3 text-sm"
      >
        <option value="xml">OWL / RDF XML</option>
        <option value="turtle">Turtle</option>
        <option value="nt">N-Triples</option>
      </select>
      <Button onClick={download} loading={busy} variant="secondary" fullWidth>
        Download ontology
      </Button>
    </div>
  );
}

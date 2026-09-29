"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { createNeuralOntologyListQueryOptions } from "../../queryOptions/createNeuralOntologyListQueryOptions";
import { createNeuralJobStatusQueryOptions } from "../../queryOptions/createNeuralJobStatusQueryOptions";
import createOntologyEntitiesQueryOptions from "../../queryOptions/createOntologyEntitiesQueryOptions";
import Button from "../ui/Button";
const control = "w-full border border-slate-300 px-3 py-2 text-sm bg-white";

export default function NeuralModels({ ontologyId }: { ontologyId: string }) {
  const client = useQueryClient();
  const [model, setModel] = useState("Keci");
  const [epochs, setEpochs] = useState(100);
  const [dimension, setDimension] = useState(128);
  const [batch, setBatch] = useState(64);
  const [job, setJob] = useState("");
  const [selected, setSelected] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [target, setTarget] = useState("tail");
  const [head, setHead] = useState("");
  const [relation, setRelation] = useState("");
  const [tail, setTail] = useState("");
  const { data: models } = useQuery(createNeuralOntologyListQueryOptions());
  const { data: entities } = useQuery(
    createOntologyEntitiesQueryOptions(ontologyId),
  );
  const { data: status } = useQuery(
    createNeuralJobStatusQueryOptions(job, !!job),
  );
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["neural-ontologies"] });
  const train = useMutation({
    mutationFn: () =>
      api<{ job_id: string }>("neural-reasoning/create", {
        ontology_id: ontologyId,
        retrain: true,
        model,
        num_epochs: epochs,
        embedding_dim: dimension,
        batch_size: batch,
      }),
    onSuccess: (result) => setJob(result.job_id),
  });
  useEffect(() => {
    if (status?.status === "completed") {
      setSelected(status.neural_ontology_id || "");
      client.invalidateQueries({ queryKey: ["neural-ontologies"] });
      setJob("");
      toast.success("Neural model is ready");
    } else if (status?.status === "failed") {
      setJob("");
      toast.error(status.error || "Training failed");
    }
  }, [status, client]);
  const upload = useMutation({
    mutationFn: async () => {
      const data = new FormData();
      data.set("embedding_file", file!);
      return api<{ neural_ontology_id: string }>(
        `neural-reasoning/upload-embedding?ontology_id=${ontologyId}`,
        data,
      );
    },
    onSuccess: (result) => {
      setSelected(result.neural_ontology_id);
      refresh();
      toast.success("Embedding loaded");
    },
  });
  const remove = useMutation({
    mutationFn: () =>
      api(`neural-reasoning/${selected}/delete`, undefined, "DELETE"),
    onSuccess: () => {
      setSelected("");
      refresh();
      predict.reset();
    },
  });
  const predict = useMutation({
    mutationFn: () =>
      api<{ predictions: { iri: string; score: number }[] }>(
        `neural-reasoning/${selected}/predict-links`,
        {
          head: target === "head" ? null : head,
          relation: target === "relation" ? null : relation,
          tail: target === "tail" ? null : tail,
          top_k: 10,
        },
      ),
  });
  const error = train.error || upload.error || remove.error;
  const items =
    models?.neural_ontologies.filter(
      (item) => item.ontology_id === ontologyId,
    ) || [];
  return (
    <div className="dashboard-workspace">
      <section className="surface-panel tool-panel space-y-5">
        <h2>Neural models</h2>
        <p className="text-sm text-slate-500">
          Train an embedding on this ontology or load a complete DICE model ZIP.
          Training runs on the server’s CPU.
        </p>
        <label className="block space-y-2 text-sm font-medium">
          <span>Trained model</span>
          <select
            aria-label="Trained model"
            className={control}
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              predict.reset();
            }}
          >
            <option value="">
              {items.length ? "Select a model…" : "No models for this ontology"}
            </option>
            {items.map((item) => (
              <option
                key={item.neural_ontology_id}
                value={item.neural_ontology_id}
              >
                {item.neural_ontology_id}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <Button
            size="sm"
            variant="secondary"
            loading={remove.isPending}
            onClick={() => {
              if (
                window.confirm(
                  "Remove this neural model from the session? The source ontology will stay available.",
                )
              )
                remove.mutate();
            }}
          >
            Remove model
          </Button>
        )}
        <details open className="border-t border-slate-200 pt-4">
          <summary className="text-sm font-semibold">Train a model</summary>
          <div className="space-y-4 mt-4">
            <label className="block text-sm space-y-2">
              <span>Embedding model</span>
              <select
                aria-label="Embedding model"
                className={control}
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {["Keci", "DistMult", "ComplEx", "TransE"].map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Epochs",
                  value: epochs,
                  setter: setEpochs,
                  min: 1,
                  max: 2000,
                  step: 1,
                },
                {
                  label: "Dimensions",
                  value: dimension,
                  setter: setDimension,
                  min: 16,
                  max: 1024,
                  step: 8,
                },
                {
                  label: "Batch size",
                  value: batch,
                  setter: setBatch,
                  min: 2,
                  max: 4096,
                  step: 1,
                },
              ].map((item) => (
                <label key={item.label} className="block text-xs space-y-2">
                  <span>{item.label}</span>
                  <input
                    type="number"
                    className={control}
                    min={item.min}
                    max={item.max}
                    step={item.step}
                    value={item.value}
                    onChange={(e) => item.setter(Number(e.target.value))}
                  />
                </label>
              ))}
            </div>
            <Button
              loading={train.isPending || !!job}
              disabled={
                !ontologyId ||
                epochs < 1 ||
                epochs > 2000 ||
                dimension < 16 ||
                dimension > 1024 ||
                dimension % 8 !== 0 ||
                batch < 2 ||
                batch > 4096
              }
              onClick={() => train.mutate()}
            >
              Train model
            </Button>
            {job && (
              <p role="status" className="text-sm text-primary">
                {status?.status === "processing"
                  ? "Training in progress…"
                  : "Training queued…"}{" "}
                You can use the other tools while it runs.
              </p>
            )}
          </div>
        </details>
        <details className="border-t border-slate-200 pt-4">
          <summary className="text-sm font-semibold">
            Upload pretrained embedding
          </summary>
          <div className="mt-4 space-y-3">
            <label className="block text-sm space-y-2">
              <span>DICE model ZIP</span>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm"
              />
            </label>
            <p className="text-xs text-slate-500">
              Include configuration.json, model weights, and entity and relation
              mappings.
            </p>
            <Button
              loading={upload.isPending}
              disabled={!file || !ontologyId}
              onClick={() => upload.mutate()}
            >
              Upload embedding
            </Button>
          </div>
        </details>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error.message}
          </p>
        )}
      </section>
      <section className="surface-panel tool-panel space-y-4">
        <h2>Link prediction</h2>
        <p className="text-sm text-slate-500">
          Rank likely subjects, relations, or objects using the selected model.
          Scores indicate model confidence, not logical entailment.
        </p>
        <label className="block text-sm space-y-2">
          <span>Predict</span>
          <select
            aria-label="Predict"
            className={control}
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              predict.reset();
            }}
          >
            <option value="tail">Object</option>
            <option value="head">Subject</option>
            <option value="relation">Relation</option>
          </select>
        </label>
        {[
          { key: "head", label: "Subject", value: head, setter: setHead },
          {
            key: "relation",
            label: "Relation",
            value: relation,
            setter: setRelation,
          },
          { key: "tail", label: "Object", value: tail, setter: setTail },
        ]
          .filter((item) => item.key !== target)
          .map((item) => (
            <label key={item.key} className="block text-sm space-y-2">
              <span>{item.label}</span>
              <input
                aria-label={item.label}
                className={control}
                list={`link-${item.key}`}
                value={item.value}
                onChange={(e) => {
                  item.setter(e.target.value);
                  predict.reset();
                }}
                placeholder="Full IRI"
              />
              <datalist id={`link-${item.key}`}>
                {(item.key === "relation"
                  ? entities?.object_properties
                  : entities?.individuals
                )?.map((entity) => (
                  <option key={entity.iri} value={entity.iri}>
                    {entity.name}
                  </option>
                ))}
              </datalist>
            </label>
          ))}
        <Button
          loading={predict.isPending}
          disabled={
            !selected ||
            (target !== "head" && !head) ||
            (target !== "relation" && !relation) ||
            (target !== "tail" && !tail)
          }
          onClick={() => predict.mutate()}
        >
          Predict links
        </Button>
        {predict.error && (
          <p role="alert" className="text-sm text-red-700">
            {predict.error.message}
          </p>
        )}
        {predict.data && (
          <div aria-live="polite" className="divide-y divide-slate-200">
            {predict.data.predictions.length ? (
              predict.data.predictions.map((item) => (
                <div
                  key={item.iri}
                  className="py-3 flex gap-4 justify-between text-xs"
                >
                  <span className="font-mono break-all">{item.iri}</span>
                  <span>{item.score.toFixed(3)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No predictions found.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

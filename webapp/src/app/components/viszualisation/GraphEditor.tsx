"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Triple } from "../../store/ontology-store";
import { api } from "../../lib/api";
import { invalidateOntologyQueries } from "../../lib/ontology-cache";
import { shortenUri } from "../../utils/graph-utils";
import Button from "../ui/Button";

export type GraphSelection =
  | { kind: "node"; id: string }
  | { kind: "edge"; triples: Triple[] }
  | { kind: "new"; subject?: string; object?: string }
  | null;

const control = "w-full border border-slate-300 px-2 py-1.5 text-xs bg-white";

export default function GraphEditor({
  ontologyId,
  triples,
  selection,
  onSelect,
}: {
  ontologyId: string;
  triples: Triple[];
  selection: GraphSelection;
  onSelect: (selection: GraphSelection) => void;
}) {
  const queryClient = useQueryClient();
  const [original, setOriginal] = useState<Triple | null>(null);
  const [subject, setSubject] = useState("");
  const [predicate, setPredicate] = useState("");
  const [object, setObject] = useState("");
  const [literal, setLiteral] = useState(false);
  const [datatype, setDatatype] = useState("");
  const [language, setLanguage] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const related = useMemo(
    () =>
      selection?.kind === "node"
        ? triples.filter(
            (triple) => triple.s === selection.id || triple.o === selection.id,
          )
        : [],
    [triples, selection],
  );

  const mutation = useMutation({
    onMutate: () => setError(""),
    onError: (error: Error) => setError(error.message),
    mutationFn: ({ method, body }: { method: string; body: unknown }) =>
      api(`modify/${ontologyId}/triples`, body, method),
    onSuccess: async (_, variables) => {
      await invalidateOntologyQueries(queryClient, ontologyId);
      onSelect(null);
      setOriginal(null);
      setSubject("");
      setPredicate("");
      setObject("");
      setDatatype("");
      setLanguage("");
      setLiteral(false);
      setConfirmRemove(false);
      setMessage(
        variables.method === "DELETE"
          ? "Triple removed."
          : "Triple saved. The graph and ontology are updated.",
      );
    },
  });

  useEffect(() => {
    setError("");
    const triple = selection?.kind === "edge" ? selection.triples[0] : null;
    setOriginal(triple);
    setSubject(
      triple?.s || (selection?.kind === "new" ? selection.subject || "" : ""),
    );
    setPredicate(triple?.p || "");
    setObject(
      triple
        ? typeof triple.o === "string"
          ? triple.o
          : triple.o.value
        : selection?.kind === "new"
          ? selection.object || ""
          : "",
    );
    setLiteral(!!triple && typeof triple.o !== "string");
    setDatatype(
      triple && typeof triple.o !== "string" ? triple.o.datatype || "" : "",
    );
    setLanguage(
      triple && typeof triple.o !== "string" ? triple.o.lang || "" : "",
    );
    setConfirmRemove(false);
    setVisibleCount(30);
  }, [selection]);

  const draft: Triple = {
    s: subject.trim(),
    p: predicate.trim(),
    o: literal
      ? {
          type: "literal",
          value: object,
          ...(datatype.trim() ? { datatype: datatype.trim() } : {}),
          ...(language.trim() ? { lang: language.trim() } : {}),
        }
      : object.trim(),
  };
  const valid =
    !!draft.s &&
    !!draft.p &&
    (literal || !!object.trim()) &&
    !(datatype && language);

  function choose(next: GraphSelection) {
    mutation.reset();
    setMessage("");
    onSelect(next);
  }

  return (
    <aside
      className="w-80 shrink-0 border-l border-slate-200 bg-white p-4 overflow-y-auto space-y-4"
      aria-label="Visual triple editor"
    >
      <div className="flex justify-between items-center gap-2">
        <h2 className="text-sm font-semibold">
          {selection?.kind === "node"
            ? "Connected triples"
            : original
              ? "Edit triple"
              : "Add triple"}
        </h2>
        <Button
          size="sm"
          variant="secondary"
          disabled={mutation.isPending}
          onClick={() => choose({ kind: "new" })}
        >
          New
        </Button>
      </div>
      {selection?.kind === "node" ? (
        <>
          <p className="text-xs font-mono break-all">{selection.id}</p>
          <Button
            size="sm"
            disabled={mutation.isPending}
            onClick={() => choose({ kind: "new", subject: selection.id })}
          >
            Add a connection
          </Button>
          <p className="text-xs text-slate-500">
            {related.length} triples. Select one to edit or remove.
          </p>
          <div className="divide-y divide-slate-200">
            {related.slice(0, visibleCount).map((triple, index) => (
              <button
                key={index}
                type="button"
                className="w-full text-left py-3 text-xs hover:bg-primary-surface break-words"
                onClick={() => choose({ kind: "edge", triples: [triple] })}
              >
                {shortenUri(triple.s)} → <strong>{shortenUri(triple.p)}</strong>{" "}
                →{" "}
                {typeof triple.o === "string"
                  ? shortenUri(triple.o)
                  : `“${triple.o.value}”`}
              </button>
            ))}
          </div>
          {visibleCount < related.length && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setVisibleCount((count) => count + 30)}
            >
              Show more triples
            </Button>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            Select an edge to edit its triple, select a node to see its
            connections, or drag between node handles to add a connection.
          </p>
          {selection?.kind === "edge" && selection.triples.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                This edge represents both directions. Choose the triple to
                change:
              </p>
              {selection.triples.map((triple, index) => (
                <button
                  key={index}
                  type="button"
                  className="block text-xs text-primary underline text-left"
                  onClick={() => choose({ kind: "edge", triples: [triple] })}
                >
                  {shortenUri(triple.s)} →{" "}
                  {typeof triple.o === "string"
                    ? shortenUri(triple.o)
                    : triple.o.value}
                </button>
              ))}
            </div>
          )}
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (valid)
                mutation.mutate({
                  method: original ? "PATCH" : "POST",
                  body: original ? { before: original, after: draft } : draft,
                });
            }}
          >
            <label className="block text-xs font-medium space-y-1">
              Subject IRI
              <input
                aria-label="Triple subject"
                className={control}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={mutation.isPending}
                required
              />
            </label>
            <label className="block text-xs font-medium space-y-1">
              Predicate IRI
              <input
                aria-label="Triple predicate"
                className={control}
                value={predicate}
                onChange={(e) => setPredicate(e.target.value)}
                disabled={mutation.isPending}
                required
              />
            </label>
            <label className="block text-xs font-medium space-y-1">
              Object type
              <select
                aria-label="Triple object type"
                className={control}
                value={literal ? "literal" : "resource"}
                onChange={(e) => {
                  setLiteral(e.target.value === "literal");
                  setDatatype("");
                  setLanguage("");
                }}
                disabled={mutation.isPending}
              >
                <option value="resource">Resource IRI</option>
                <option value="literal">Literal value</option>
              </select>
            </label>
            <label className="block text-xs font-medium space-y-1">
              {literal ? "Literal value" : "Object IRI"}
              <textarea
                aria-label="Triple object"
                className={control}
                rows={2}
                value={object}
                onChange={(e) => setObject(e.target.value)}
                disabled={mutation.isPending}
                required={!literal}
              />
            </label>
            {literal && (
              <>
                <label className="block text-xs font-medium space-y-1">
                  Datatype IRI (optional)
                  <input
                    aria-label="Literal datatype"
                    className={control}
                    value={datatype}
                    onChange={(e) => setDatatype(e.target.value)}
                    disabled={mutation.isPending}
                    placeholder="http://www.w3.org/2001/XMLSchema#string"
                  />
                </label>
                <label className="block text-xs font-medium space-y-1">
                  Language (optional)
                  <input
                    aria-label="Literal language"
                    className={control}
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={mutation.isPending}
                    placeholder="en"
                  />
                </label>
                {datatype && language && (
                  <p className="text-xs text-red-700">
                    Use either a datatype or a language.
                  </p>
                )}
              </>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={!valid || mutation.isPending}
              loading={mutation.isPending}
            >
              {original ? "Save triple" : "Add triple"}
            </Button>
          </form>
          {original && (
            <div className="pt-3 border-t border-slate-200">
              {confirmRemove ? (
                <div className="space-y-2">
                  <p className="text-xs">
                    Remove the selected triple from the ontology?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate({ method: "DELETE", body: original })
                      }
                    >
                      Confirm remove
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={mutation.isPending}
                      onClick={() => setConfirmRemove(false)}
                    >
                      Keep triple
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={mutation.isPending}
                  onClick={() => setConfirmRemove(true)}
                >
                  Remove triple
                </Button>
              )}
            </div>
          )}
        </>
      )}
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-xs text-primary" role="status">
          {message}
        </p>
      )}
    </aside>
  );
}

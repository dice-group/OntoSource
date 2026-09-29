"use client";
import { useEffect, useState } from "react";
import ComboBox from "./ComboBox";
import Button from "./ui/Button";
import { PROVIDERS, type Connection } from "../lib/providers";
import type { ApiProtocol, CatalogModel } from "../lib/model-catalog";
const control = "w-full border border-slate-300 px-3 py-2 text-sm bg-white";

export default function ProviderConnection({
  value,
  onChange,
}: {
  value: Connection;
  onChange: (value: Connection) => void;
}) {
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [freeOnly, setFreeOnly] = useState(false);
  const provider = PROVIDERS.find(
    (item) => item.base === value.apiBase && item.protocol === value.protocol,
  );
  useEffect(() => {
    const controller = new AbortController();
    setModels([]);
    setBusy(false);
    setError("");
    setUpdated("");
    setFreeOnly(false);
    if (!value.apiBase.trim()) return;
    const timeout = setTimeout(async () => {
      setBusy(true);
      try {
        const response = await fetch("/api/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_base: value.apiBase,
            api_key: value.apiKey,
            api_protocol: value.protocol,
          }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.detail || "Cannot fetch the model catalog");
        if (!controller.signal.aborted) {
          setModels(data.entries);
          setUpdated(new Date(data.fetched_at).toLocaleTimeString());
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error
              ? error.message
              : "Cannot fetch the model catalog",
          );
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 600);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [value.apiBase, value.apiKey, value.protocol, refresh]);
  useEffect(() => {
    const update = () => setRefresh((number) => number + 1);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") update();
    }, 300000);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", update);
    };
  }, []);
  const freeModels = models.filter((model) => model.freeTextTokens);
  return (
    <section className="space-y-5" aria-label="Model connection">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="provider-preset"
            className="block text-sm font-medium mb-2"
          >
            Provider preset
          </label>
          <select
            id="provider-preset"
            className={control}
            value={provider?.id || "custom"}
            onChange={(event) => {
              const preset = PROVIDERS.find(
                (item) => item.id === event.target.value,
              );
              onChange({
                apiBase: preset?.base || "",
                protocol: preset?.protocol || "openai",
                apiKey: "",
                modelName: "",
              });
            }}
          >
            <option value="custom">Custom domain / gateway</option>
            <optgroup label="Hosted providers">
              {PROVIDERS.filter(
                (item) => !["ollama", "lmstudio"].includes(item.id),
              ).map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                  {item.offer ? ` · ${item.offer}` : ""}
                </option>
              ))}
            </optgroup>
            <optgroup label="Local servers">
              {PROVIDERS.filter((item) =>
                ["ollama", "lmstudio"].includes(item.id),
              ).map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div>
          <label
            htmlFor="api-protocol"
            className="block text-sm font-medium mb-2"
          >
            API protocol
          </label>
          <select
            id="api-protocol"
            className={control}
            value={value.protocol}
            onChange={(e) =>
              onChange({
                ...value,
                protocol: e.target.value as ApiProtocol,
                apiKey: "",
                modelName: "",
              })
            }
          >
            <option value="openai">OpenAI compatible</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Google Gemini</option>
            <option value="ollama">Ollama native</option>
          </select>
        </div>
      </div>
      {provider?.offer && (
        <p className="text-xs text-slate-500">
          {provider.offer}.{" "}
          {provider.details && (
            <>
              <a
                className="text-primary underline"
                href={provider.details}
                target="_blank"
                rel="noreferrer"
              >
                Check current limits and terms
              </a>
              . Availability depends on your account and selected model.
            </>
          )}
        </p>
      )}
      <div>
        <label
          htmlFor="api-base-select"
          className="block text-sm font-medium mb-2"
        >
          API base URL
        </label>
        <input
          id="api-base-select"
          type="url"
          className={`${control} font-mono`}
          value={value.apiBase}
          onChange={(e) =>
            onChange({
              ...value,
              apiBase: e.target.value,
              apiKey: "",
              modelName: "",
            })
          }
          placeholder="https://your-domain.example/v1"
        />
        <p className="text-xs text-slate-500 mt-2">
          Use a hosted API, your own domain, a compatible gateway, or a local
          server. Include the API prefix, such as /v1. Localhost refers to the
          machine running OntoSource.
        </p>
      </div>
      <div>
        <label htmlFor="api-key" className="block text-sm font-medium mb-2">
          API key{" "}
          <span className="font-normal text-slate-500">(if required)</span>
        </label>
        <input
          id="api-key"
          type="password"
          autoComplete="off"
          className={control}
          value={value.apiKey}
          onChange={(e) =>
            onChange({ ...value, apiKey: e.target.value, modelName: "" })
          }
          placeholder="Optional for local servers"
        />
      </div>
      <div className="border-t border-slate-200 pt-5 space-y-3">
        <div className="flex justify-between items-center gap-4">
          <h2 className="text-sm font-semibold">Available models</h2>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !value.apiBase.trim()}
            onClick={() => setRefresh((number) => number + 1)}
          >
            Refresh models
          </Button>
        </div>
        {freeModels.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
            />
            Zero token price only ({freeModels.length})
          </label>
        )}
        <ComboBox
          id="model-select"
          label="Model"
          value={value.modelName}
          onChange={(modelName) => onChange({ ...value, modelName })}
          options={(freeOnly ? freeModels : models).map((model) => ({
            ...model,
            description: model.freeTextTokens
              ? "Zero input/output token price reported by the provider"
              : undefined,
          }))}
          loading={busy}
          placeholder="Search models or enter a custom model ID…"
          hint={
            busy
              ? "Fetching live catalog…"
              : updated
                ? `${models.length} models · updated ${updated}`
                : "Custom model IDs work even when discovery is unavailable"
          }
        />
        <p
          role="status"
          className={`text-xs ${error ? "text-red-700" : "text-slate-500"}`}
        >
          {error ||
            (updated && !models.length
              ? "The provider returned no models. Check access or enter a model ID manually."
              : "Refreshed on connection changes, window focus, and every five minutes. Models without capability metadata may need checking with your provider.")}
        </p>
      </div>
    </section>
  );
}

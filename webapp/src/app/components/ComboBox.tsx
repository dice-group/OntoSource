"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";

export interface ComboBoxOption {
  value: string;
  label: string;
  description?: string;
}

interface ComboBoxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboBoxOption[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  loading?: boolean;
  hint?: string;
  className?: string;
  id?: string;
}

export default function ComboBox({
  value,
  onChange,
  options,
  placeholder = "Select or type a value…",
  label,
  required,
  loading = false,
  hint,
  className = "",
  id,
}: ComboBoxProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFilter("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(filter.toLowerCase()) ||
      opt.value.toLowerCase().includes(filter.toLowerCase()) ||
      (opt.description?.toLowerCase().includes(filter.toLowerCase()) ?? false),
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      onChange(v);
      setFilter(v);
      setActiveIndex(-1);
      if (!open) setOpen(true);
    },
    [onChange, open],
  );

  const handleSelect = useCallback(
    (opt: ComboBoxOption) => {
      onChange(opt.value);
      setFilter("");
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange],
  );

  const handleFocus = useCallback(() => {
    setOpen(true);
    setFilter("");
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); setOpen(true);
        setActiveIndex((index) => Math.max(0, Math.min(filteredOptions.length - 1, index + (e.key === "ArrowDown" ? 1 : -1))));
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        setFilter("");
        inputRef.current?.blur();
      }
      if (e.key === "Enter") {
        if (activeIndex >= 0 && filteredOptions[activeIndex]) {
          handleSelect(filteredOptions[activeIndex]);
          e.preventDefault();
        } else if (filteredOptions.length === 1) {
          handleSelect(filteredOptions[0]);
          e.preventDefault();
        } else {
          setOpen(false);
        }
      }
    },
    [filteredOptions, handleSelect, activeIndex],
  );

  const matchedOption = options.find((o) => o.value === value);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${inputId}-options`}
          aria-autocomplete="list"
          aria-activedescendant={open && activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 placeholder-slate-500 bg-white text-sm transition-colors"
        />

        <button
          type="button"
          tabIndex={-1}
          aria-label={`Toggle ${label || "options"}`}
          aria-expanded={open}
          onClick={() => {
            setOpen((prev) => !prev);
            if (!open) inputRef.current?.focus();
          }}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-600"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg
              className={`w-4 h-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {matchedOption && matchedOption.label !== matchedOption.value && (
        <p className="mt-1 text-xs text-primary font-medium">{matchedOption.label}</p>
      )}

      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}

      {open && (
        <div id={`${inputId}-options`} role="listbox" aria-label={label || "Options"} className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Fetching available models…
            </div>
          )}

          {filteredOptions.length === 0 && !loading && (
            <div className="px-4 py-3 text-sm text-slate-500">
              {options.length === 0
                ? "No presets available — type a custom value"
                : "No matches — press Enter to use custom value"}
            </div>
          )}

          {filteredOptions.map((opt, index) => (
            <button
              key={opt.value}
              id={`${inputId}-option-${index}`}
              role="option"
              aria-selected={opt.value === value}
              type="button"
              onClick={() => handleSelect(opt)}
              className={[
                "w-full text-left px-4 py-2.5 text-sm transition-colors",
                opt.value === value || index === activeIndex
                  ? "bg-primary-surface text-primary-dark"
                  : "text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <div className="font-medium">{opt.label}</div>
              {opt.description && (
                <div className="text-xs text-slate-500 mt-0.5">{opt.description}</div>
              )}
              {opt.label !== opt.value && (
                <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">{opt.value}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

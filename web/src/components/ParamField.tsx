import type { ReactNode } from "react";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  slider?: boolean;
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
  slider,
}: NumberFieldProps) {
  return (
    <label>
      <span>{label}</span>
      {slider && max != null && min != null ? (
        <>
          <input
            type="range"
            min={min}
            max={max}
            step={step ?? 1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          <span className="field-value">
            {value}
            {hint ? ` — ${hint}` : ""}
          </span>
        </>
      ) : (
        <>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          {hint ? <span className="field-value">{hint}</span> : null}
        </>
      )}
    </label>
  );
}

interface BooleanFieldProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}

export function BooleanField({ label, value, onChange, hint }: BooleanFieldProps) {
  return (
    <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ color: "var(--text)" }}>{label}</span>
      {hint ? <span className="field-value" style={{ marginLeft: "auto" }}>{hint}</span> : null}
    </label>
  );
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface GroupProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Group({ title, defaultOpen = true, children }: GroupProps) {
  // Collapsed state via uncontrolled DOM toggle — keeps the store clean.
  return (
    <details className="group" open={defaultOpen}>
      <summary className="group-header">{title}</summary>
      <div className="group-body">{children}</div>
    </details>
  );
}

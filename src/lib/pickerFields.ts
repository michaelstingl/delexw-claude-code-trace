/** Which per-session detail fields show in the session picker's meta line
 *  (and the header totals). Persisted in localStorage so it survives reloads.
 *  All fields default ON.
 *
 *  Extensibility: to add a new toggleable field, add its id to `PickerField`,
 *  add a `{ id, label }` entry to `PICKER_FIELDS`, and add it to
 *  `DEFAULT_PICKER_FIELDS`. `loadPickerFields` merges the stored value over
 *  the defaults, so existing users automatically get the new field turned on
 *  without needing a migration. */
export type PickerField = "model" | "turns" | "tok" | "cost" | "duration" | "totals";

export const PICKER_FIELDS: { id: PickerField; label: string }[] = [
  { id: "model", label: "Model" },
  { id: "turns", label: "Turns" },
  { id: "tok", label: "Tokens" },
  { id: "cost", label: "Cost" },
  { id: "duration", label: "Duration" },
  { id: "totals", label: "List totals" },
];

export const DEFAULT_PICKER_FIELDS: Record<PickerField, boolean> = {
  model: true,
  turns: true,
  tok: true,
  cost: true,
  duration: true,
  totals: true,
};

export const PICKER_FIELDS_KEY = "cct.pickerFields";

/** Read the persisted field visibility, merged over the defaults so unknown
 *  or missing keys (e.g. a field added in a later version) default to shown. */
export function loadPickerFields(): Record<PickerField, boolean> {
  if (typeof localStorage === "undefined") return { ...DEFAULT_PICKER_FIELDS };
  const raw = localStorage.getItem(PICKER_FIELDS_KEY);
  if (raw === null) return { ...DEFAULT_PICKER_FIELDS };
  try {
    const parsed = JSON.parse(raw) as Partial<Record<PickerField, boolean>>;
    return { ...DEFAULT_PICKER_FIELDS, ...parsed };
  } catch {
    return { ...DEFAULT_PICKER_FIELDS };
  }
}

/** Persist the field visibility, ignoring write failures (quota / disabled storage). */
export function savePickerFields(fields: Record<PickerField, boolean>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PICKER_FIELDS_KEY, JSON.stringify(fields));
  } catch {
    // Storage may be full or disabled; the in-memory setting still applies.
  }
}

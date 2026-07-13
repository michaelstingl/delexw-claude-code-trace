import { useCallback, useState } from "react";
import { loadPickerFields, savePickerFields, type PickerField } from "../lib/pickerFields";

export function usePickerFields(): [
  Record<PickerField, boolean>,
  (next: Record<PickerField, boolean>) => void,
] {
  const [fields, setFields] = useState(loadPickerFields);
  const set = useCallback((next: Record<PickerField, boolean>) => {
    setFields(next);
    savePickerFields(next);
  }, []);
  return [fields, set];
}

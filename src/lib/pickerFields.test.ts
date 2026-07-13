import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PICKER_FIELDS_KEY,
  DEFAULT_PICKER_FIELDS,
  loadPickerFields,
  savePickerFields,
} from "./pickerFields";

describe("pickerFields", () => {
  beforeEach(() => localStorage.clear());

  it("defaults all fields to true when unset", () => {
    expect(loadPickerFields()).toEqual(DEFAULT_PICKER_FIELDS);
  });

  it("round-trips a saved value", () => {
    const fields = { ...DEFAULT_PICKER_FIELDS, cost: false };
    savePickerFields(fields);
    expect(JSON.parse(localStorage.getItem(PICKER_FIELDS_KEY)!)).toEqual(fields);
    expect(loadPickerFields()).toEqual(fields);
  });

  it("merges a stored partial object over the defaults (missing key -> true)", () => {
    localStorage.setItem(PICKER_FIELDS_KEY, JSON.stringify({ tok: false }));
    expect(loadPickerFields()).toEqual({ ...DEFAULT_PICKER_FIELDS, tok: false });
  });

  it("ignores an unknown stored key (harmless, future-proof)", () => {
    localStorage.setItem(PICKER_FIELDS_KEY, JSON.stringify({ notAField: true }));
    const loaded = loadPickerFields();
    expect(loaded).toMatchObject(DEFAULT_PICKER_FIELDS);
  });

  it("falls back to defaults on malformed JSON", () => {
    localStorage.setItem(PICKER_FIELDS_KEY, "{not json");
    expect(loadPickerFields()).toEqual(DEFAULT_PICKER_FIELDS);
  });

  it("ignores write failures", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => savePickerFields(DEFAULT_PICKER_FIELDS)).not.toThrow();
    spy.mockRestore();
  });
});

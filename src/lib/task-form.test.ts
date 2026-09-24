import { describe, it, expect } from "vitest";
import { buildDuePayload, taskToDateTimeFields } from "@/lib/task-form";

describe("buildDuePayload", () => {
  it("clears when no date", () => {
    expect(buildDuePayload("", "")).toEqual({ dueDate: null, dueAt: null });
  });

  it("date only", () => {
    expect(buildDuePayload("2026-03-25", "")).toEqual({
      dueDate: "2026-03-25",
      dueAt: null,
    });
  });
});

describe("taskToDateTimeFields", () => {
  it("uses dueDate when no dueAt", () => {
    expect(taskToDateTimeFields({ dueDate: "2026-03-25", dueAt: null })).toEqual({
      dueDate: "2026-03-25",
      dueTime: "",
    });
  });
});

import assert from "node:assert/strict";
import test from "node:test";
import { labelPrototypeSignals } from "./raete-provenance.ts";

const dimensions = ["Materials", "Quality", "Longevity"].map((name) => ({
  name, provenance: "prototype",
}));

test("labels every synthetic dimension even when the model omits provenance", () => {
  assert.equal(
    labelPrototypeSignals("Quality leads; materials and longevity are the tradeoff. Price is lower.", dimensions),
    "Quality (Prototype) leads; materials (Prototype) and longevity (Prototype) are the tradeoff. Price is lower.",
  );
});

test("does not duplicate existing labels and is idempotent", () => {
  const text = "Quality (Prototype) leads on Longevity (Prototype signal).";
  const once = labelPrototypeSignals(text, dimensions);
  assert.equal(once, "Quality (Prototype) leads on Longevity (Prototype).");
  assert.equal(labelPrototypeSignals(once, dimensions), once);
});

test("does not relabel Channel3 dimensions or invent missing signals", () => {
  assert.equal(
    labelPrototypeSignals("Materials and Price lead.", [{ name: "Materials", provenance: "channel3" }]),
    "Materials and Price lead.",
  );
});

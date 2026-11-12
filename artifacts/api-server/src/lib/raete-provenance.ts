/**
 * Enforce provenance in generated prose rather than relying on model compliance.
 * This changes labels only, never supplied dimensions, priorities, or rankings.
 */
export function labelPrototypeSignals(
  explanation: string,
  dimensions: ReadonlyArray<{ name: string; provenance: string }>,
): string {
  let labeled = explanation;
  for (const name of ["Materials", "Quality", "Longevity"]) {
    if (!dimensions.some((dimension) =>
      dimension.name.toLowerCase() === name.toLowerCase() && dimension.provenance === "prototype"
    )) continue;
    const mentions = new RegExp(`\\b${name}\\b(?:\\s*\\(Prototype(?: signal)?\\))?`, "gi");
    labeled = labeled.replace(mentions, (mention) =>
      `${mention.replace(/\s*\(Prototype(?: signal)?\)$/i, "")} (Prototype)`
    );
  }
  return labeled;
}

---
name: Ranking integrity
description: User requirements for auditing RAETE rankings and selecting honest deterministic explanations.
---

Do not alter product data, synthetic scores, weights, or normalization merely to produce different winners across presets. The same product may legitimately stay #1.

**Why:** The user explicitly rejected forcing winner diversity for the hackathon demo.

**How to apply:** Audit a single live Channel3 snapshot and its weighted contributions before changing ranking. If the demo needs distinct winners, find a live query that naturally produces them rather than manipulating scores.

The primary deterministic explanation must not lead with a Low-priority dimension when a higher-priority dimension contributes to the win. Explain opposing advantages when there is no clean single reason.

**Why:** The user repeatedly flagged Low-priority dimensions being presented as the reason for winning as unacceptable.

**How to apply:** Consider user priority and positive weighted advantage together. Preserve score calculations and disclose prototype provenance.

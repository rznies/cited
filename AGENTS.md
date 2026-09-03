# AGENTS.md — rznies/cited

AEO Visibility Audit — $29 one-time audit: does Google AI + ChatGPT recommend you, and who beats you?

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in `rznies/cited` (gh CLI). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: root `CONTEXT.md` (lazy, via grill-with-docs/domain-modeling) + `docs/adr/`. See `docs/agents/domain.md`.

Working vocabulary: teaser, gate ($29), webScore (`generateReport`), pasteScore (`scorePaste`), who-beats-me, fix.
Shipped verdict: Variant 2 who-beats-me-first wins; V1 score-first is X A/B backup; V3 checklist-first killed. Prototype on `prototype/aeo-v1-v2-v3`.

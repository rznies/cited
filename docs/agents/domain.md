# Domain Docs

Single-context repo. Engineering skills consume domain docs as follows.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root (to be created lazily via `/grill-with-docs` or `/domain-modeling` when terms get resolved).
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront.

## File structure

```
/ (rznies/cited)
├── CONTEXT.md            ← glossary: citation, webScore, pasteScore, teaser, gate, who-beats-me, fix
├── docs/adr/             ← e.g. V2 who-beats-me-first wins, two seams, capped 5th fix
├── docs/agents/          ← issue-tracker.md (this setup), domain.md
└── src/ (Next.js, when scaffolded)
```

## Use the glossary's vocabulary

When output names a domain concept (issue title, refactor proposal, test name), use the term as defined in `CONTEXT.md`. Current working vocabulary (pre-glossary):

- **teaser** — free slice: webScore + 2/10 prompts
- **gate** — $29 unlock for full 10 prompts + winners + 5 fixes
- **webScore** — 0-100 from Firecrawl citations (`generateReport`)
- **pasteScore** — 0-100 from pasted ChatGPT text (`scorePaste`)
- **who-beats-me** — winners table (name, page, cites/10)
- **fix** — 1 of 5 impact-ordered, dev-shippable items

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (…), but worth reopening because…_

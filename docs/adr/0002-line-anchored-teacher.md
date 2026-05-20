# ADR-0002: Replace the summoned "friend" with a line-anchored "teacher" (the marginalian)

- **Status:** Accepted
- **Date:** 2026-05-20
- **Deciders:** shiv

## Context

The original v0.1 AI behaviour described in `CONTEXT.md` (under the previous
`### AI friend behaviour (v0.1)` section, now superseded) was a *friend*:

- A small summonable popup, closed by default.
- Lives in the corner of the scene, on top of the work surface.
- Tone peer-to-peer, casual; the learner taps it on the shoulder when stuck.
- Proactively surfaces a Socratic question only at the atom-completion beat.

That shipped as the inkwell popup in `app/scenes/balance-ledger/page.tsx` and
the first cut of `app/api/friend/route.ts`. Running the first prototype against
real learners (and against the strategic reads from the Carlos × Jeffrey/RareSkills
meet on 2026-05-08) surfaced two problems.

**Problem 1: the friend has no shared pointer with the learner.**
A "friend in the corner" can't see what the learner is looking at. Every
exchange requires the learner to describe where they are in the code — "I'm
on the line with the mapping" — which is the wrong cognitive load to add on
top of learning solidity. The runtime already knows the cursor line; the AI
should know it too, and should be able to *move* it.

**Problem 2: a chat partner is not the right metaphor for "I am about to teach you ERC-20."**
A summoned popup biases toward Q&A: the learner asks, the AI answers. That's
the same shape as the SRE chatbot, which `CONTEXT.md` explicitly calls
out-of-scope: *"Conversational scaffolding (the chat-with-the-page experience)
is **out of scope** — the SRE site already does that."* The v0.1 bet is on a
fundamentally different shape: AI as *question curator*, not explainer
(Carlos × Jeffrey framing). A friend-popup form factor doesn't encode that
bet; it actively works against it by inviting the learner to ask explanation
questions.

## Decision

Replace the summoned corner friend with a **line-anchored teacher** — *the
marginalian* — that:

1. **Lives beside the editor, anchored to the cursor line.** Not in a corner.
   Not summoned. Always present, like a tutor sitting next to you.
2. **Shares a pointer with the learner.** A manicule (☞) in the CodeMirror
   gutter tracks the cursor line natively. The teacher has a `pointAtLine`
   tool that moves the manicule + cursor + panel anchor as a single act.
   The teacher's finger and the learner's cursor are the same thing.
3. **Runs a guided line-by-line walkthrough, not a Q&A.** The system prompt
   enforces: one line of code (or one tight logical group) per turn, point
   first then speak, end with exactly one question, never lecture, never dump
   ahead. The teacher drives the pace; the learner can interrupt with
   questions but the default shape is *teacher walks, learner predicts*.
4. **Persona shifts from friend to teacher.** Still warm, exacting, concise,
   plain. Still no hype, no cheerleading, no em dashes. But now the
   asymmetry is explicit: the teacher knows the contract, the learner is
   here to learn it. Pretending the relationship is peer-to-peer was a
   politeness that got in the way of the pedagogy.

The shape lives in three places:

- **`app/api/friend/route.ts`** — system prompt rewrites the persona, declares
  the `pointAtLine` tool (client-forwarded, no `execute`), uses
  `stepCountIs(8)` to bound the per-message tool loop.
- **`app/scenes/balance-ledger/page.tsx`** — `ManiculeMarker` + `teacherGutter`
  for the in-gutter pointing hand; the marginalian panel re-anchors to the
  CodeMirror selection head; on receiving a `pointAtLine` tool call from the
  stream the client moves the cursor and replies via `addToolResult`, then
  `sendAutomaticallyWhen` on the server resumes so the teacher keeps speaking.
- **Context passed to the model** — adds `cursorLine: { number, text }` to
  the existing `{ atomId, source, balances, recentTransfers }` payload so
  the teacher always knows what the learner is looking at, not just what
  they typed.

The route handler keeps the filename `friend/route.ts` for now — renaming the
route is a chore not worth doing mid-v0.1, and the URL doesn't leak to the
learner. The user-visible name is *the marginalian*.

## Alternatives considered

### A. Keep the friend, add a `pointAtLine` tool

The cheap fix. The friend stays a corner popup but gains a pointing hand.
Rejected because it solves only Problem 1 (shared pointer). It leaves the
form factor — summoned, chat-shaped, asymmetric only when the learner asks —
unchanged, so the deeper Problem 2 (the metaphor invites Q&A instead of
walkthrough) is still there. Half-fixing the deixis without fixing the
metaphor would have produced an awkward chat bubble that occasionally moves
the cursor.

### B. Inline annotations on every line, no panel

Like an IDE comment overlay. The teacher annotates each line directly,
no separate panel. Rejected because it doesn't compose with the editor —
either the annotations are static (no conversation, no questions, no
adaptation) or they invade the editor surface (every line gets an inline
bubble, the scene becomes unreadable). The split — *gutter manicule for
deixis*, *separate panel for conversation* — keeps the editor clean and
gives the conversation room to breathe.

### C. Voice-first teacher (clicky-style)

The form factor we eventually want, but explicitly deferred per
`CONTEXT.md`'s "fully out of scope for v0.1" list. v0.1 has to validate the
*pedagogy* (does the line-by-line walkthrough + one-question-per-turn
actually pull learners through the atom?) before investing in the delivery
(voice + on-screen pointing). Re-evaluate after the v0.1 atom-completion
loop is closed and we have real learner reactions.

## Consequences

**Positive:**

- The teacher and learner share a single pointer, eliminating the
  describe-where-you-are cognitive tax.
- The form factor encodes the v0.1 bet (AI as question curator running a
  guided walkthrough) instead of working against it (AI as chat partner).
- The `pointAtLine` tool round-trip is the first non-trivial agentic loop in
  the codebase. Patterns it establishes (client-forwarded tool, no server
  `execute`, `addToolResult` + `sendAutomaticallyWhen`-style resume) will
  carry into future tools (e.g. `runTransfer`, `highlightBalance`) without
  re-architecting.
- The system prompt now carries the *script* of the explain-tier
  checkpoint walkthrough for balance-ledger. v0.2's dynamic question
  generation (per the explain → justify → apply gradient in CONTEXT.md's
  `### decomposition unit`) has a concrete behaviour to *replace* rather
  than design from scratch.

**Negative / costs accepted:**

- Tool adherence becomes a model-quality dimension we now depend on.
  `deepseek/deepseek-v4-flash` is the default for speed and cost, but if it
  drops `pointAtLine` calls the walkthrough degrades to a chat. The
  `OPENROUTER_MODEL` override is the escape hatch; isolating *model* vs
  *code* when the loop misbehaves becomes a recurring debugging step.
- The route is no longer a thin wrapper. The `stepCountIs` budget, the
  resume-on-tool-result discipline, and the system prompt are now load-bearing
  for the experience. A future agent editing the route without reading this
  ADR is likely to break the walkthrough.
- The persona pivot means the `### AI friend behaviour (v0.1)` section in
  `CONTEXT.md` had to be rewritten in place. Older vault entries and the
  sandgarden update from 2026-05-07 still say "friend." Those are
  historical record; CONTEXT.md is the source of truth.

## Reversibility

Medium. The route handler, the `pointAtLine` tool, and the gutter manicule
are localised; reverting to a corner-popup friend means deleting the gutter
extension, replacing the panel layout, and rewriting the system prompt.
Roughly half a day. But the bet behind the pivot — that the walkthrough
form factor is the right vehicle for the v0.1 hypothesis — should be
falsified by *learner reactions to the marginalian*, not by reverting to
the friend before we've seen it run.

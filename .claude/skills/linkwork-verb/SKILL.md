---
name: linkwork-verb
description: Build or extend a Linkwork verb, a short spec that compiles to a scene whose motion is computed by code. Use when a motion or setup can't be drawn by any existing verb, when a planner's specs keep failing because a verb is missing an option, or when preparing the verbs a chapter's films will need.
---

# Building a Linkwork verb

A verb turns a short, meaningful spec into a scene and checks the spec first. A model that plans a scene only chooses
a verb and fills its spec; it never computes physics. So a missing verb shows up as specs that cannot pass, not as a
wrong picture, as long as the verb's checks are honest. Read `DESIGN.md` (Verbs, Checks, Verb lifecycle) and
`LEARNINGS.md` first.

Requires Node ≥ 23.6 (TypeScript runs directly; no build step).

## 1. Recognise a missing verb

When a planner's specs fail, read its attempts. A missing verb or option has a recognisable pattern:
- the errors are the verb's limits, not slips ("angle is 0 to 89 degrees", "leaves the frame");
- the planner then dodges the limit with a spec that passes but shows the wrong thing (a ball resting on a table
  instead of one thrown straight up);
- a reviewer rejects that picture every round.

Format slips (word counts, ids) belong to the planner, not to Linkwork.

## 2. Extend before you add

Read `src/verbs/cards.ts` and `src/verbs/index.ts`.
- If a verb nearly fits, give it an option instead of writing a new verb. Vertical free fall became
  `motion_on_line` with `axis.vertical`, `accelerate`, `ground`, `building` and `every`.
- A new verb must be general ("a block on an incline with friction, given angle, μ and mass"), never written for one
  question.

## 3. Design the spec

- Fields in a textbook's own terms and units (x0, v0, a; degrees; metres), few and meaningful.
- Code computes everything that follows: times, peaks, ranges, speeds. Numbers on screen are readouts measured from
  the drawing, so they always agree with it.
- Every number a narration may quote goes in `meta.facts`, formatted with units.
- Fit the frame to the motion, or refuse early with an error that says how to fix it ("widen axis.range", "end the
  motion when it lands"). Errors are read by a model: each one names the field and the fix.
- Keep `illustrative: true` working. Put numbers only in readouts, text props and axes, so `illustrate()` hides them.

## 4. Implement

- Code goes in `src/verbs/<family>.ts`: `<verb>Errors(spec): string[]` and `<verb>(spec): Scene`. Match the
  neighbouring code: dense, commented by intent, using the `fmt`, `round` and `isNum` helpers.
- Layout conventions:
  - 1920×1080 with `k = H / 1080`;
  - the drawing on the left (up to about 0.6 W);
  - title and readouts in the right panel (`px = 0.66 W`), stacked by `row`.
- Colours are theme tokens only: paper, ink, muted, faint, accent, figure, good, bad, cool. An unknown token renders
  black.
- Register the verb:
  - In `index.ts`: its `VERBS` entry with a one-line `about`, and the `Spec` union.
  - In `cards.ts`, its card:
    - concepts as books name them, `use_when` and `not_when`;
    - `fields` explained for a planner;
    - an `example` that compiles (planners judge the verb's typical length from it);
    - `status: 'candidate'` or `'trial'` (see DESIGN.md: candidate → trial → trusted).
  - Update neighbouring cards' `not_when` so planners are routed to the new verb.

## 5. Test

- Add tests to `test/core.test.ts` (physics) or `test/maths.test.ts`:
  - the physics or maths checked against formulas, using a textbook's worked-example numbers;
  - every new error.
- `npm test` and `npx tsc --noEmit` must pass.

## 6. Look at it

- Write an example spec and compile it with `compile()` from `src/verbs/index.ts`.
- Run `node src/cli.ts check <scene.json>`.
- Render frames at several times with `node src/cli.ts svg <scene.json> --t <s> -o f.svg`, then convert them to PNG
  with any SVG renderer (cairosvg, rsvg-convert, a browser).
- Look at every frame and fix what you see:
  - overlapping labels;
  - black text (a bad colour token);
  - anything cut off at the edges;
  - a picture that doesn't show what the narration will say.

## 7. Ship

- Add the verb to `README.md`'s list.
- Add any rule a mistake taught to `LEARNINGS.md`.
- Commit with the reason (what could not be drawn, and how it failed).
- Licences: no dependency that isn't MIT, BSD or Apache-2.0.

## Build it so a student can drive it

A verb may become a play (`src/play/plays.ts`): a student moves its inputs and predicts the result. Design for that from the start, even when the film needs only one value:

- **Inputs are physical quantities.** Take speed and angle, not a finished path. Each control maps onto a field, and the verb computes the rest.
- **Offer one fixed scale.** If a drawing fits itself to the frame, a changing value looks unchanged. Fitting is a fine default for a film, but give an option that holds the window (`x`/`y` on `plane_motion`, `window` on `ray_diagram`). A value compared across settings must share one scale, including bars and arrows sized against their own largest value.
- **Keep the picture true.** Enlarged growth, stretched heights and fixed-height bars can suit a film if the panel says so, but they rule out a play. Where the truth can't be drawn, the verb is not playable. Say so rather than faking it.
- **Don't give the answer away early.** The first frames show the set-up and the result arrives later, so a student can predict first. Keep a static result behind `show` or an option (`hide_path`).
- **Publish what a test can measure.** Name anchors for the points that carry the physics (`profile_junction`), so a play's probe can compare drawn length with the real quantity.
- **State the domain.** Find where the picture holds and where the physics changes (an object at F has no image), and refuse or note what lies outside it. A play's range stays inside.
- **Stay fast and self-contained.** Compile runs on every slider move in a browser: pure code, no Node APIs at compile time, no heavy loops.

A play must pass `test/plays.test.ts`: one scale across the range, a clean `check()`, and every challenge winnable. Worth adding a play when moving the input teaches something a student would guess wrong.

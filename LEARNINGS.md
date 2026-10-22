# Planning Linkwork scenes: learnings

These rules are meant for the system prompt of the model that plans a Linkwork scene: it writes the narration and
a verb spec, and places each event on a word of the narration. Every rule below comes from a mistake that a check
caught or a reviewer saw while building the examples and the first pilot film (hydrogen's line spectrum,
2026-10-23). Linkwork's checks refuse most of these mistakes. Getting them right first saves a retry.

## Numbers and facts

1. **Say the number the verb computes.** Every value in the narration must match the scene's computed facts
   (`meta.facts`, the readouts, `ladderFacts`). Read them; never compute them yourself. Examples: 3 → 2 in hydrogen
   is 1.89 eV and 656 nm; 4 → 2 is 2.55 eV and 486 nm; 5 → 2 is 2.86 eV and 434 nm.
2. **Write numbers in words in the narration** ("twelve point zero nine electron volts"). The voice reads them
   as written, and the audio check compares against them.
3. **Name colours the way the scene names them.** 486 nm is "blue-green", not "blue" (the scene's label comes from
   `colourName`). Light outside 380–750 nm has no colour: call it ultraviolet or infrared.
4. **Follow the textbook's own values and examples** where it has them. NCERT gives E₁ = −2.18 × 10⁻¹⁸ J
   (= −13.6 eV), and its worked example is the 5 → 2 line. A film that reaches the book's example lets the learner
   check it against the page.
5. **Domain and range claims are checked against f.** Write them as `x >= 0`, `-1 <= y <= 1`, `x != 0` or `all`.
   A claim that is wrong anywhere in the x window is refused, with the x or y where it fails.

## Placing events on words

6. **Anchor an event to the word that names the action**, such as "absorbs", "falls" or "drops", so the picture
   changes as the narrator says it. For an absorption, the photon is already travelling and arrives on that word.
7. **Keep events at least 2.5 s apart.** "Lift it to rung five, and let it fall back" puts two events 1.3 s apart
   and is refused. Anchor the second to a later word that names its result instead (the fall on "violet", as the
   colour is named).
8. **Give the first event room.** An incoming photon needs 1.2 s to cross the screen, so the first event cannot
   come in the opening 1.4 s.
9. **Choose anchor words that are heard once and clearly:** a verb or a colour. Avoid numbers, which speech
   recognition writes as digits ("five" is heard as "5"; the pilot maps 0–10 back, but larger numbers aren't
   mapped), and avoid words that occur earlier in the same point. The anchor is the first match after the previous
   event's word.
10. **One idea per point, with at most two events.** The second event's card replaces the first after 2.5 s, so a
    point's sentences should finish explaining one event before the next begins.

## State that must stay consistent

11. **The electron is where the last event left it.** Each event's `from` must be the current level. Absorbing goes
    up (higher n) and emitting goes down. A sequence such as 1→3, 3→2, 2→1, 1→4, 4→2, 2→5, 5→2 is valid.
12. **Hops on a number line must land on it** and must not overlap: each hop starts after the previous one has
    landed (about 0.25 s + 0.45 s + 0.08 s per unit + 0.4 s).
13. **Keep the curve inside its window.** For `extrema`, f must stay within the y window across the x window, and
    the window must hold 1–5 turning points. For `secant_to_tangent`, the curve must stay in the window from `at` to
    `at + h`. For `area_under`, f must be defined from `from` to `to`.

## Words on screen

14. **Keep titles short**: about 25 characters a line, two lines at most. They wrap to the panel's width.
15. **Each caption is one sentence of at most about 90 characters.** Long sentences are split at commas, so write
    them with natural commas. A caption that wraps would run off the bottom of the frame.
16. **Don't repeat what the panel already shows.** The card already shows ΔE = E₃ − E₂ … and λ = hc / ΔE …. The
    narration should say what it means ("that is red light"), not read out the working.

## Voice (LuxTTS)

17. **Narration is about 155–165 words a minute** at speed 0.75 (LuxTTS speeds speech up 1.3× internally; the
    default gabbles and drops sentences). Plan a point's length from that rate.
18. **Every point clip is checked against its text.** Spell technical words normally ("semilunar", "nanometres");
    the voice handles them. If the speech recogniser mishears a word (it heard "Samaluna"), the voice is not the
    problem.

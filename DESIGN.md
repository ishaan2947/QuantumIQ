# QuantumIQ — Design System

The visual language of QuantumIQ, why it is what it is, and the rules that keep
it coherent as the product grows.

---

## 1. Concepts considered

Three directions were developed before any code was written. All three start
from the same conviction — **the interface should come from the subject, not
from the web** — but they take it to different places.

### Concept A — *The Console*

> The site is a piece of laboratory equipment with its faceplate facing the
> reader.

**Visual direction.** Copper and gold on warm near-black, sampled from the
dilution-refrigerator photograph. Square corners, hairline rules, machined
panels butted against each other with no gaps. Nothing floats, nothing glows.
Monospace is the readout typeface and appears *only* where a real instrument
would print a number: ket notation, coordinates, probabilities, gate names,
step counters. Headings in a technical grotesk. The page has the density of
equipment rather than the airiness of marketing.

**First screen.** A nameplate line, a plain two-line headline, and the
cryostat holding the right half of the viewport, fading into the page at its
edges so the hardware emerges rather than ending at a photo border. Along the
bottom, labelled qubit wires `|q0⟩ |q1⟩` fade in from the left and run under
the photograph — the structural rhyme the whole design hangs on, since a
dilution refrigerator is a stack of horizontal gold plates and a circuit
diagram is a stack of horizontal wires. The hero hands off to the console by
simply starting those wires. Directly below, with no marketing section in
between, the working simulator.

*As built, revised twice:* an earlier version ran three hairlines across the
full viewport so they would land on the refrigerator's plates. Pixel alignment
against an `object-cover` crop is not reliable across viewports, and a rhyme
that is nearly aligned reads as a mistake rather than an idea — so the wires
moved to a strip at the hero's foot, where the rhyme survives and the alignment
is no longer load-bearing. The second revision was for mobile: the copy
originally sat over the photograph at every size behind a heavy scrim, and its
body text crossed the bright coils at contrast that did not hold up. Below
`lg`, the photograph is now a band *above* the copy instead of a layer behind
it.

**Signature interaction.** *The keypad.* Gates are physical keys — travel on
press, a real pressed state, the keyboard shortcut engraved on the keycap in
8px mono. Grouped by family through fill, outline and width rather than by
colour. Pressing `H` on the keyboard arms the Hadamard key; the key depresses.

### Concept B — *The Tape*

> Scrolling the page *is* scrubbing through the circuit.

**Visual direction.** The same copper-on-black, but the entire page is one
continuous time axis running top to bottom. No sections — just a tape with
tick marks, timecodes down the left gutter, and a playhead fixed at the
viewport's centre line. Amplitude readouts drawn like oscilloscope traces.

**First screen.** No hero copy at all. The circuit is drawn at enormous scale,
wires running off both edges, parked at `t0` with every qubit in `|0⟩`. The
only text is a timecode and a single instruction: `scroll to advance time`.
The cryostat photograph is withheld until the very bottom — the payoff, "this
is the machine that actually does it", reversing the usual hero order.

**Signature interaction.** *Scroll is time.* As the reader scrolls, the
playhead advances through the circuit; the Bloch vectors rotate and the
probability bars redistribute in lockstep with scroll position, with
annotations entering the margin to explain each step as it happens.

**Why it was not chosen.** It is the boldest of the three and the one I most
wanted to build, but it fails the guardrail: binding the circuit to scroll
position means the reader cannot scroll past the simulator without operating
it, cannot operate it without scrolling, and on a phone the two gestures
collide outright. It also makes the primary interaction invisible to a
keyboard or screen-reader user. Ambition is not allowed to cost usability,
so it was cut — but its central idea was not. *Time as a visible, scrubbable
axis with a playhead sweeping the circuit* is the best thing in any of these
three concepts, and it survives in the chosen design as the transport,
operated deliberately instead of accidentally.

### Concept C — *The Record*

> The site is a typeset technical document with working figures in it.

**Visual direction.** Warm graphite rather than black — the colour of a
notebook left open under a desk lamp. Typography-forward: a real measure, real
hanging indents, marginalia. Every interactive panel is a numbered **Figure**
with a caption set beneath it in the same voice as the body text. Copper used
only for annotation marks and reference numbers.

**First screen.** A preprint title block — title, author, date, abstract —
followed immediately by *Figure 1: a Bell pair, step by step*, live and
operable, with its caption.

**Signature interaction.** *Live notation.* Every `|00⟩` in the running prose
is a real reference into the simulator: hover it and the corresponding bar in
the measurement panel lights, the corresponding basis state in the statevector
highlights. Explanation and instrument are wired to each other, so reading the
page and operating it are the same act.

**Why it was not chosen as the base.** It is the most respectful of the
learner and the closest in spirit to Quantum Country, but as the frame for the
*whole* site it undersells a product whose single best argument is that it
runs. A document frame asks to be read; this product asks to be used.

---

## 2. The choice

**Concept A, *The Console*, as the frame — carrying Concept B's playhead and
Concept C's figure discipline.**

The reasoning:

1. **The product is the argument.** The simulator is real, instant, and runs
   with the backend asleep. Anything standing between the visitor and it —
   feature cards, a value proposition, a second hero — is a worse version of
   the thing it describes. The console opens at the top of the page and the
   feature section is deleted outright, replaced by four short annotations
   printed *on* the instrument it describes.

2. **The subject is hardware.** Quantum computing's physical reality is a
   machined copper object hanging in a vacuum. An instrument faceplate is the
   honest interface for it, and it rules out, by construction, every pattern
   on the diagnosis list: no gradient can survive on a machined panel, no glow
   can survive on a matte one, no rounded-2xl card can sit in a rack.

3. **Time is the one thing a circuit diagram cannot show.** A static diagram
   shows the gates; it cannot show the state moving through them. The playhead
   is the mechanism that makes the physics visible, and it earns the only
   substantial motion on the site.

4. **A figure is better than a feature.** Each panel carries an index number
   and one sentence about how to *read* it — not what it does for you. The
   Bloch panel does not say "3D Visualisation"; it says that an entangled
   qubit's vector is genuinely shorter, and why.

5. **The console opens on Superposition, not the Bell pair.** The Bell pair is
   the better circuit and the worse *opening state*: both qubits are maximally
   entangled, so both Bloch vectors have length zero, and a first-time visitor
   meets a sphere that looks broken. One Hadamard puts `q0` on the equator at
   `|+⟩` and leaves `q1` at `|0⟩` — two visible vectors, two probability bars,
   every panel demonstrably alive. The Bell pair is one click away, and
   arriving at it *by pressing it* is what makes the vectors visibly collapse,
   which is the lesson the State panel's annotation promises.

What was deliberately left on the table: Concept B's scroll-is-time (cut for
usability, its playhead kept) and Concept C's hover-linked notation in running
prose (the chosen frame has little running prose to link into; the idea
survives in miniature as the exact-probability tick mark on each measurement
bar).

---

## 3. Palette

Every colour is sampled from the dilution-refrigerator photograph. Copper is
the **only** accent. There is no second accent, no cyan, no purple, and no
gradient anywhere in the system.

### Ground — warm blacks and graphite

| Token | Hex | Role |
|---|---|---|
| `void` | `#080706` | Page background. Warm black, not neutral — the photograph's background. |
| `panel` | `#100E0C` | Faceplate ground. Every panel sits on this. |
| `panel-raised` | `#17140F` | Raised surface: keycaps, inputs, table header rows. |
| `panel-sunk` | `#0B0A08` | Recessed surface: readout wells, the circuit canvas, bar troughs. |
| `rule` | `#241F19` | Hairline divider. The default 1px border everywhere. |
| `rule-strong` | `#352D24` | Panel outline, keycap edge — a visible seam between parts. |

### Accent — copper and gold

| Token | Hex | Role |
|---|---|---|
| `copper-100` | `#F7E0C4` | Brightest highlight. Text on a filled copper key. |
| `copper-200` | `#EFC79C` | Hover text, active readout values. |
| `copper-300` | `#E2A871` | Secondary accent text, axis labels. |
| `copper-400` | `#D28E4E` | **Primary accent.** Buttons, state vector, bars, playhead. |
| `copper-500` | `#B2702F` | Pressed / dimmed accent. |
| `copper-600` | `#8A531F` | Borders on accent surfaces. |
| `copper-700` | `#5E3814` | Deep tint — wire highlight, bar trough fill. |
| `copper-900` | `#2A1A0C` | Darkest tint — armed-key face, selected row. |

### Steel — the nickel tubing

| Token | Hex | Role |
|---|---|---|
| `steel-200` | `#D6D0C6` | — reserved, unused at present. |
| `steel-400` | `#9D968A` | Secondary neutral: phase-gate keys, axis rules. |
| `steel-600` | `#60594F` | Tertiary marks, inactive ticks. |

### Text

| Token | Hex | On `panel` | Role |
|---|---|---|---|
| `ink-primary` | `#F0EAE1` | 16.4:1 | Headings, values, body emphasis. |
| `ink-secondary` | `#ABA399` | 7.9:1 | Body copy, captions. |
| `ink-tertiary` | `#857D73` | 4.9:1 | Labels, units, metadata. Smallest type that still carries meaning. |
| `ink-faint` | `#5A544C` | 2.4:1 | **Decorative only** — zero-value rows, disabled glyphs, never load-bearing text. |

### Signal

| Token | Hex | Role |
|---|---|---|
| `signal` | `#C4382B` | The refrigerator's red crown. **Destructive actions only** — clear, delete, failure. Never decorative, never more than one instance on screen. |

**Contrast.** Every text/background pair above meets WCAG AA at its size.
`ink-faint` is the one token below AA and is restricted by rule to marks that
carry no information a sighted-only reader would lose (a zero-probability row
is also labelled `0.0%` in `ink-tertiary`).

---

## 4. Typography

Three faces, each with a job. No face appears outside its job.

| Role | Face | Why |
|---|---|---|
| Display / headings | **Space Grotesk** | A precise grotesk with drawn, slightly mechanical terminals — it reads as engineered rather than neutral, and it is not Inter. |
| Body / UI | **IBM Plex Sans** | Designed for technical documentation, with a warmth that keeps dense panels readable. The Plex family's origin is also honest to the subject. |
| Readouts | **IBM Plex Mono** | Pairs with Plex Sans by construction. Used **only** for: ket notation `\|00⟩`, coordinates, probabilities, gate symbols, step counters, shortcuts, panel nameplates. Never for prose. |

All numeric readouts set `font-variant-numeric: tabular-nums` so digits do not
shift width as values change during playback. This is not a detail — without
it, every probability bar's label jitters on every step.

### Scale

A 1.25 ratio, truncated to the sizes actually needed. Nothing is interpolated.

| Token | Size / line-height / tracking | Use |
|---|---|---|
| `display` | 56px / 1.0 / −0.03em | Hero headline (desktop) |
| `display-sm` | 38px / 1.05 / −0.025em | Hero headline (mobile) |
| `h2` | 28px / 1.15 / −0.02em | Section headings |
| `h3` | 18px / 1.3 / −0.01em | Panel titles |
| `body` | 15px / 1.6 | Prose |
| `small` | 13px / 1.5 | Captions, secondary prose |
| `micro` | 11px / 1.4 / 0.14em, uppercase | Panel nameplates, labels |
| `readout` | 13px / 1.4 / tabular | Values |
| `readout-sm` | 11px / 1.3 / tabular | Dense values, keycap shortcuts |

---

## 5. Spacing and geometry

**Spacing** is a 4px base, restricted to: `4, 8, 12, 16, 20, 24, 32, 48, 64,
96`. Panels use 16px internal padding at `small` and 20px at `large`; section
vertical rhythm is 64px (mobile) / 96px (desktop). Identical padding on every
panel is *not* the goal — a readout well is tighter than a prose block, and
the system says so explicitly rather than averaging them.

**Radii** are near-square, because machined aluminium is:

| Token | Value | Use |
|---|---|---|
| `--r-panel` | 3px | Panels, inputs, buttons |
| `--r-key` | 4px | Keycaps |
| `--r-tight` | 2px | Bars, ticks, chips |

Nothing in the system is more rounded than 4px. There are no pills.

**Borders** are always 1px and always a token (`rule` or `rule-strong`).
Depth comes from stacked panel values and hairlines, never from shadow
spread — the only box-shadows in the system are the 1px inset on a keycap and
its removal on press.

---

## 6. Gate system

Gates are grouped by **physical family**, and the grouping is expressed through
**fill, outline, width and glyph weight** — never hue. There are exactly two
chromatic values in the entire gate system: copper and steel.

| Family | Gates | Keycap treatment | Circuit treatment |
|---|---|---|---|
| **Superposition** | `H` | Filled copper face, `copper-100` glyph — the only solid key on the board | Filled copper box |
| **Pauli** | `X` `Y` `Z` | Raised graphite face, `copper-600` edge, `copper-200` glyph | Outlined box, copper edge |
| **Phase** | `S` `T` | Raised graphite face, `rule-strong` edge, `steel-400` glyph, **copper underline rule** marking it as a Z-rotation | Outlined box with a copper baseline tick |
| **Entangling** | `CX` `CCX` | Double-width key, `copper-600` edge, glyph drawn as ● + ⊕ | Textbook control dot, ⊕ target, 1px copper connector |

Rationale: the four families differ in *what they do to the state* — H creates
superposition, Pauli rotates by π about an axis, S/T rotate by a fraction of π
about Z, CX/CCX act on more than one qubit at a time. H is the only gate that
takes a basis state somewhere a basis state cannot go, so it is the only
filled key. Entangling gates are the only ones that need two wires, so they
are the only wide keys — the key's shape tells you its arity before you read
it.

---

## 7. Motion

Motion exists to explain the physics. There is no decorative motion in the
system: no particles, no floating, no twinkle, no shimmer, no ambient drift.

**One easing curve**, `cubic-bezier(0.2, 0, 0, 1)` — fast departure, long
settle. An instrument's needle moves this way.

**Four durations**, and nothing between them:

| Token | ms | Use |
|---|---|---|
| `--t-key` | 90 | Keypress. Must feel mechanical, i.e. nearly instant. |
| `--t-state` | 180 | Hover, focus, selection, panel state change. |
| `--t-move` | 420 | A value moving because the physics moved: bar widths, playhead position, vector rotation. |
| `--t-enter` | 560 | Content entering on first view. Used once per element, never on re-entry. |

**What moves, and why:**

- The **playhead** sweeps between time steps. It is the clock.
- **Probability bars** re-flow their width over `--t-move`; the exact-value
  tick moves with them. Rows never reorder — only widths change — so the eye
  can track one basis state across a whole playback.
- The **Bloch vector** lerps toward its new orientation in the render loop
  rather than snapping, so a rotation reads as a rotation.
- **Entanglement** links the affected wire labels with a copper tie the moment
  the state stops being separable.

**Reduced motion.** Under `prefers-reduced-motion: reduce`, transforms and
entrance animations are removed entirely — content renders at its final
position. Width and colour transitions on *readouts* are kept but shortened to
120ms, because a bar that teleports between values loses the comparison the
bar exists to make; and the Bloch vector snaps instead of lerping. Reduced
motion means no gratuitous movement, not no feedback.

---

## 8. Principles

1. **The instrument is the argument.** Lead with the working thing. If a
   section describes a capability that is visible and operable 200px further
   down the page, delete the section.

2. **Every mark is a measurement.** Monospace, copper, a tick, a rule — each
   appears because something real needs reading, never because a surface
   looked empty. If a mark cannot be read, it does not ship.

3. **One accent, earned.** Copper marks *state* — what is active, armed,
   selected, or measured. The moment it is used for decoration it stops
   meaning anything, and the interface goes quiet.

4. **Depth from material, not light.** Panels stack, hairlines separate, keys
   have travel. Nothing glows, because nothing on a machined faceplate glows.

5. **Honest states.** The tutor can be asleep, rate-limited, or unconfigured,
   and the simulator keeps working regardless — so every degraded state says
   plainly what is down, what still works, and what to do. A degraded
   instrument still reads correctly; it just reports less.

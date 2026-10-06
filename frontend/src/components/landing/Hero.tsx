/**
 * The opening.
 *
 * What it is NOT, deliberately: a pill badge with a dot, a gradient headline,
 * a glowing CTA next to an outlined one, a particle field, or a slogan. All of
 * those were here before and all of them are on the diagnosis list.
 *
 * What it is: a nameplate, a plain statement of what the thing does, one solid
 * button, and the hardware. The photograph is a dilution refrigerator —
 * portrait, vertically symmetric, shot against near-black — so it gets its own
 * column and keeps its silhouette rather than being cropped to a horizontal
 * band behind full-width text. Its own background is near-black, so instead of
 * laying a scrim over it we fade its edges into the page: the hardware appears
 * to emerge from the page rather than sitting in a rectangle on top of it.
 *
 * On a phone the photograph becomes a band above the copy rather than a layer
 * behind it. The first pass put the copy over the image at every size and
 * leaned on a heavy scrim, and the body text crossed the bright coils at
 * contrast that did not hold up.
 *
 * The strip along the bottom is the structural idea the whole design hangs on
 * (DESIGN.md §1): a dilution refrigerator is a stack of horizontal gold
 * plates, and a circuit diagram is a stack of horizontal wires. The hero hands
 * off to the console below by simply starting the wires here.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

import { GITHUB_REPO_URL } from '../../config/env';

/** The nameplate line: a specification, not a marketing badge. */
const SPEC = ['QuantumIQ', 'Statevector simulator', 'Browser-side', 'No sign-up'];

const EASE = [0.2, 0, 0, 1] as const;

const rise = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

export default function Hero() {
  const prefersReducedMotion = useReducedMotion();

  // Under reduced motion the stagger is skipped entirely rather than being
  // run faster: content renders where it belongs, immediately.
  const container = prefersReducedMotion
    ? {}
    : {
        initial: 'hidden' as const,
        animate: 'visible' as const,
        transition: { staggerChildren: 0.07, delayChildren: 0.04 },
      };

  const item = prefersReducedMotion
    ? {}
    : { variants: rise, transition: { duration: 0.56, ease: EASE } };

  return (
    <section id="top" className="relative isolate overflow-hidden bg-void">
      {/* ── The hardware ─────────────────────────────────────────────────
          Two layouts, because the photograph cannot do the same job at both
          sizes. From lg it takes the right half and the copy sits beside it on
          flat ground. On a phone it becomes a band *above* the copy instead of
          lying behind it: there is no scrim dark enough to carry body text over
          those coils while leaving the hardware worth looking at, so it stops
          trying to do both jobs with one layer. */}
      <div
        className="relative h-[38vh] min-h-[15rem] w-full overflow-hidden
                   lg:absolute lg:inset-0 lg:left-[50%] lg:h-auto lg:min-h-0 lg:w-auto"
      >
        <picture>
          <source srcSet="/cryostat.webp" type="image/webp" />
          <img
            src="/cryostat.jpg"
            alt="A dilution refrigerator: the layered copper and steel assembly that cools a quantum processor to near absolute zero"
            className="h-full w-full object-cover object-[50%_22%]"
            decoding="async"
          />
        </picture>

        {/* Edge masking. The source is already near-black at its borders, so
            fading to the page background makes the hardware emerge from the page
            instead of ending at a photo edge.

            Horizontal fade is desktop-only — on the mobile band there is no copy
            column to the left to fade towards, and applying it there just washes
            the image out. */}
        <div
          aria-hidden
          className="absolute inset-0 hidden lg:block lg:bg-gradient-to-r lg:from-void
                     lg:via-void/20 lg:via-20% lg:to-transparent"
        />
        {/* Vertical fade. On mobile this dissolves the band's lower edge into
            the copy beneath it, so there is no visible photo edge anywhere. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-void from-2% via-transparent to-void/70"
        />

        {/* Grain, so the photograph and the flat UI read as one material rather
            than a render pasted onto a page. Scoped to the image wrapper: on
            mobile the copy is no longer over the image and should not be
            textured. */}
        <div aria-hidden className="grain absolute inset-0" />
      </div>

      {/* ── Copy ───────────────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-console px-4 pb-24 pt-7 sm:px-6 sm:pb-28 sm:pt-9 lg:px-8 lg:pb-36 lg:pt-36">
        <motion.div {...container} className="max-w-[34rem] lg:max-w-[38rem] xl:max-w-[44rem]">
          {/* Nameplate. Mono, letterspaced, under a hairline — stamped on a
              faceplate rather than floating in a pill. */}
          <motion.div {...item} className="mb-7 border-t border-rule-strong pt-3">
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-micro uppercase text-ink-tertiary">
              {SPEC.map((entry, i) => (
                <span key={entry} className="flex items-center gap-2.5">
                  {i > 0 && (
                    <span aria-hidden className="text-ink-faint">
                      ·
                    </span>
                  )}
                  {entry}
                </span>
              ))}
            </p>
          </motion.div>

          {/* Each sentence is its own block so the break never lands
              mid-sentence, and text-balance evens the two lines it wraps to on
              a phone rather than leaving a one-word orphan. Sizes are tuned so
              both sentences hold a single line from lg up. */}
          <motion.h1
            {...item}
            className="font-display text-[2rem] font-bold leading-[1.05] tracking-[-0.025em]
                       text-ink-primary sm:text-[2.5rem] lg:text-[2.75rem] lg:leading-none
                       lg:tracking-[-0.03em] xl:text-[3.25rem]"
          >
            <span className="block text-balance">Build a quantum circuit.</span>
            <span className="block text-balance">Watch the state move.</span>
          </motion.h1>

          <motion.p
            {...item}
            className="mt-6 max-w-prose text-body leading-relaxed text-ink-secondary"
          >
            A statevector simulator that runs in this tab, a live Bloch sphere,
            and a tutor that can read the circuit you built. Place gates, then
            scrub through the circuit one time step at a time and watch the
            probabilities redistribute.
          </motion.p>

          <motion.div {...item} className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <a href="#console" className="btn-primary">
              Open the console
              <ArrowDown className="h-3.5 w-3.5" />
            </a>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-quiet"
            >
              Source on GitHub
            </a>
          </motion.div>

          {/* A plate caption for the photograph beside it. Set here rather than
              over the image: the body text crossed the bright coils there and
              fell below AA, and a caption you cannot read is decoration. */}
          <motion.figcaption
            {...item}
            className="mt-12 max-w-[21rem] border-l border-copper-700 pl-3.5"
          >
            <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-copper-300">
              Dilution refrigerator
            </span>
            <span className="mt-1 block text-[11px] leading-relaxed text-ink-tertiary">
              Each gold plate is a colder stage. The processor hangs at the
              bottom, near 10&nbsp;mK — colder than deep space.
            </span>
          </motion.figcaption>
        </motion.div>
      </div>

      {/* ── Handoff ────────────────────────────────────────────────────
          The wires start here and the console picks them up. Two qubits,
          labelled, fading in from the left — the same stack the plates above
          are drawn in. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0">
        <div className="mx-auto max-w-console px-4 sm:px-6 lg:px-8">
          <div className="space-y-5 pb-6">
            {[0, 1].map((qubit) => (
              <div key={qubit} className="flex items-center gap-3">
                <span className="w-gutter flex-shrink-0 font-mono text-readout-sm text-ink-faint">
                  |q{qubit}⟩
                </span>
                <span className="rule-fade-r h-px flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

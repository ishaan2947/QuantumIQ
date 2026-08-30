/**
 * Landing hero — a split composition: copy on the left, the cryostat on the
 * right, running the full height of the section.
 *
 * Why split rather than a full-bleed background image. The photograph is a
 * dilution refrigerator: a tall, vertically symmetric object shot at 3000x4000
 * against near-black. Stretching that behind full-width text would crop it to
 * a horizontal band of coils and throw away the silhouette, which is the whole
 * reason the image reads as "quantum computer" at a glance. Giving it its own
 * column preserves the subject intact and leaves the copy on flat background
 * where it needs no scrim to stay legible.
 *
 * The image's own background is near-black, so instead of laying a dark
 * gradient over the photo we fade its edges into the page background. The
 * hardware appears to emerge from the page rather than sitting in a rectangle
 * on top of it — there is no visible photo edge anywhere.
 *
 * Palette note: the hardware is copper and the interface is cyan. That is the
 * complementary pairing on purpose — the warm subject is the only warm thing
 * on the page, so the eye goes to it, and the cool UI stays clearly separate
 * from the photography.
 */

import { useMemo, useRef } from 'react';
import { motion, useReducedMotion, useTransform } from 'framer-motion';
import { ArrowRight, Github } from 'lucide-react';

import { usePointerParallax } from '../../lib/useParallax';
import { GITHUB_REPO_URL } from '../../config/env';

/**
 * Deterministic PRNG so particle positions are identical on every render and
 * every build. Math.random() here would reshuffle the field on each re-render,
 * which is visible as a flicker.
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Sparse motes drifting around the hardware, warm to match the copper.
 *
 * Two layers rather than the usual three, and low counts: against a mostly
 * black frame every mote is visible, and a dense field would read as dust on
 * the lens instead of depth.
 */
const PARTICLE_LAYERS = [
  { travel: 12, count: 7, size: [1.5, 2.5], opacity: 0.35, seed: 1337 },
  { travel: 30, count: 4, size: [2.5, 4], opacity: 0.5, seed: 4242 },
] as const;

type Parallax = ReturnType<typeof usePointerParallax>;

function ParticleField({
  layer,
  px,
  py,
}: {
  layer: (typeof PARTICLE_LAYERS)[number];
  px: Parallax['px'];
  py: Parallax['py'];
}) {
  const particles = useMemo(() => {
    const random = mulberry32(layer.seed);
    return Array.from({ length: layer.count }, (_, i) => ({
      id: i,
      left: 12 + random() * 76,
      top: 15 + random() * 70,
      size: layer.size[0] + random() * (layer.size[1] - layer.size[0]),
      delay: random() * 6,
      duration: 7 + random() * 6,
    }));
  }, [layer]);

  const x = useTransform(px, (v) => v * -layer.travel);
  const y = useTransform(py, (v) => v * -layer.travel * 0.6);

  return (
    <motion.div
      aria-hidden
      style={{ x, y }}
      className="parallax-layer pointer-events-none absolute inset-0"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className="animate-twinkle absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: layer.opacity,
            backgroundColor: '#fbbf7a',
            boxShadow: `0 0 ${p.size * 3}px ${p.size}px rgba(251, 146, 60, 0.3)`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </motion.div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const { px, py } = usePointerParallax(heroRef);
  const prefersReducedMotion = useReducedMotion();

  // The hardware drifts slightly against the pointer. Small numbers on
  // purpose: this should register as the object having depth, not as the page
  // moving underneath the reader.
  const imageX = useTransform(px, (v) => v * -20);
  const imageY = useTransform(py, (v) => v * -14);

  // A warm pool of light behind the cryostat, drifting the opposite way, so
  // the object appears to sit in front of its own glow.
  const glowX = useTransform(px, (v) => v * 26);
  const glowY = useTransform(py, (v) => v * 18);

  return (
    <section ref={heroRef} id="top" className="relative isolate overflow-hidden bg-ink-950">
      {/* Warm ambient pool behind the hardware.
          Lives at section level rather than inside the image column: it needs
          to spill left past the column edge to read as ambient light, and the
          column below clips its own contents. */}
      {!prefersReducedMotion && (
        <motion.div
          aria-hidden
          style={{ x: glowX, y: glowY }}
          className="pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[62%]"
        >
          <div
            className="absolute left-1/2 top-1/2 h-[46rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(251,146,60,0.13) 0%, rgba(234,88,12,0.05) 42%, transparent 70%)',
            }}
          />
        </motion.div>
      )}

      {/* ── Image column ──────────────────────────────────────────────
          Full-bleed behind the copy on mobile (the portrait aspect suits a
          phone), pinned to the right side from lg up.

          overflow-hidden is load-bearing: without it the parallax translate
          slides the image past the column's left edge and paints a hairline
          seam down the middle of the page. */}
      <div className="absolute inset-0 overflow-hidden lg:left-[46%]">
        <motion.div
          style={{ x: imageX, y: imageY }}
          // scale must exceed the parallax travel or the translate exposes the
          // container edge. At 1.12 the image overhangs ~6% each side, far
          // more than the 20px it ever moves. The source is 1600px shown at
          // ~1080px, so this is still downscaling -- no sharpness cost.
          className="parallax-layer absolute inset-0 scale-[1.12]"
        >
          <picture>
            <source srcSet="/cryostat.webp" type="image/webp" />
            <img
              src="/cryostat.jpg"
              alt="A dilution refrigerator — the layered copper and steel assembly that cools a quantum processor to near absolute zero"
              className="h-full w-full object-cover object-[center_38%] lg:object-[42%_center]"
              decoding="async"
            />
          </picture>
        </motion.div>

        {/*
          Edge masking. The source is already near-black at its borders, so
          fading to the page background makes the hardware emerge from the page
          instead of ending at a photo edge. On mobile the same gradient doubles
          as the scrim that keeps the copy readable over the image.
        */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/75 to-ink-950/25 lg:via-ink-950/15 lg:via-25% lg:to-transparent"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/60"
        />
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink-950 to-transparent"
        />
      </div>

      {/* Grain, tying the photographic layer to the flat UI so the two don't
          read as separate materials. */}
      <div aria-hidden className="hero-grain absolute inset-0" />

      {!prefersReducedMotion &&
        PARTICLE_LAYERS.map((layer) => (
          <ParticleField key={layer.seed} layer={layer} px={px} py={py} />
        ))}

      {/* ── Copy ──────────────────────────────────────────────────────── */}
      <div className="relative mx-auto flex min-h-[44rem] max-w-7xl items-center px-6 py-28 lg:min-h-[92vh] lg:px-10">
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.1, delayChildren: 0.05 }}
          className="max-w-xl"
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, ease: EASE }}
            className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium tracking-wide text-gray-300 backdrop-blur-sm"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow-300 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-glow-300" />
            </span>
            Agentic AI tutor · Qiskit simulation · Live demo
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, ease: EASE }}
            className="text-gradient-quantum text-6xl font-bold leading-[0.95] tracking-tight sm:text-7xl lg:text-[5.5rem]"
          >
            QuantumIQ
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: EASE }}
            className="mt-6 text-lg leading-relaxed text-gray-300/90 sm:text-xl"
          >
            Learn quantum computing through an interactive AI tutor and live
            circuit simulator.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, ease: EASE }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <a
              href="#demo"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-glow-400 to-quantum-500 px-7 py-3.5 text-sm font-semibold text-ink-950 shadow-glow-md outline-none transition-shadow duration-300 hover:shadow-glow-lg focus-visible:ring-2 focus-visible:ring-glow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
            >
              Try the Demo
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-gray-200 backdrop-blur-sm outline-none hover:border-white/25 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-glow-300"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </motion.div>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: EASE }}
            className="mt-7 text-sm text-gray-500"
          >
            No signup required — the simulator runs entirely in your browser.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

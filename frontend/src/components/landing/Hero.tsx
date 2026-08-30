/**
 * Landing hero — the photograph, the gradient that dissolves it into the page,
 * and the pointer-driven parallax that keeps it from feeling like a static
 * screenshot.
 *
 * A note on the image: quant.jpg is portrait (896x1088), so as a full-bleed
 * landscape banner it is cropped hard and upscaled. Both are handled here
 * rather than by re-cutting the asset — `object-position` keeps the crop on
 * the faces and the hologram at every breakpoint, and the overlay stack is
 * heavy enough that the upscale softness reads as atmospheric depth. On
 * narrow viewports the aspect ratio actually matches, so the crop relaxes.
 *
 * The parallax is built from four layers moving at different rates:
 *   photograph  slowest, feels furthest away
 *   far/mid/near particle fields, progressively faster
 *   cursor bloom, tracking the pointer exactly
 *
 * All of them move *against* the pointer, which is how real parallax reads —
 * shift your head right and near objects slide left further than far ones.
 * Text stays put; moving the thing someone is reading is just noise.
 */

import { useMemo, useRef } from 'react';
import { motion, useReducedMotion, useTransform } from 'framer-motion';
import { ArrowRight, Github, ChevronDown } from 'lucide-react';

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

interface ParticleLayer {
  /** Pixels this layer travels across the full width of the hero. */
  travel: number;
  count: number;
  size: [number, number];
  opacity: number;
  blur: number;
  seed: number;
}

/**
 * Three depths of glowing motes. They sit over the middle band of the photo,
 * where the hologram and the lit chip are, so they read as part of the
 * projection rather than snow over the whole frame.
 */
const PARTICLE_LAYERS: ParticleLayer[] = [
  { travel: 10, count: 11, size: [1.5, 2.5], opacity: 0.45, blur: 0, seed: 1337 },
  { travel: 26, count: 7, size: [2.5, 4], opacity: 0.6, blur: 0.5, seed: 4242 },
  { travel: 46, count: 4, size: [4, 6.5], opacity: 0.75, blur: 1, seed: 8888 },
];

function useParticles(layer: ParticleLayer) {
  return useMemo(() => {
    const random = mulberry32(layer.seed);

    return Array.from({ length: layer.count }, (_, i) => ({
      id: i,
      // Kept inside the hologram band of the photograph.
      left: 14 + random() * 72,
      top: 28 + random() * 50,
      size: layer.size[0] + random() * (layer.size[1] - layer.size[0]),
      delay: random() * 6,
      duration: 6 + random() * 6,
    }));
  }, [layer]);
}

function ParticleField({ layer, px, py }: {
  layer: ParticleLayer;
  px: ReturnType<typeof usePointerParallax>['px'];
  py: ReturnType<typeof usePointerParallax>['py'];
}) {
  const particles = useParticles(layer);
  const x = useTransform(px, (v) => v * -layer.travel);
  const y = useTransform(py, (v) => v * -layer.travel * 0.65);

  return (
    <motion.div
      aria-hidden
      style={{ x, y }}
      className="parallax-layer pointer-events-none absolute inset-0"
    >
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute rounded-full bg-glow-200 animate-twinkle"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: particle.size,
            height: particle.size,
            opacity: layer.opacity,
            filter: layer.blur ? `blur(${layer.blur}px)` : undefined,
            boxShadow: `0 0 ${particle.size * 3}px ${particle.size}px rgba(103, 232, 249, 0.35)`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
    </motion.div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const { px, py } = usePointerParallax(heroRef);
  const prefersReducedMotion = useReducedMotion();

  // The photograph moves least — it is the furthest "away".
  const imageX = useTransform(px, (v) => v * -14);
  const imageY = useTransform(py, (v) => v * -9);

  // The bloom tracks the pointer exactly, so the hologram appears to catch
  // light wherever the visitor is looking.
  const bloomLeft = useTransform(px, (v) => `${(v + 0.5) * 100}%`);
  const bloomTop = useTransform(py, (v) => `${(v + 0.5) * 100}%`);

  return (
    <section
      ref={heroRef}
      id="top"
      className="relative isolate flex min-h-[38rem] items-center overflow-hidden bg-ink-950 lg:min-h-[92vh]"
    >
      {/* ── Layer 1: the photograph ─────────────────────────────────── */}
      <motion.div
        style={{ x: imageX, y: imageY }}
        className="parallax-layer absolute inset-0 -z-10 scale-[1.06]"
      >
        <img
          src="/quant.jpg"
          alt="Researchers examining a glowing quantum processor and its holographic projection in a darkened lab"
          // Portrait source: the crop is pulled upward on wide screens to keep
          // faces and hologram in frame instead of centring on the table.
          className="h-full w-full object-cover object-[center_42%] lg:object-[center_36%]"
          decoding="async"
          // The source is 896x1088, so on a wide viewport this is upscaled
          // roughly 3x. A little extra contrast and saturation stops the
          // interpolation reading as a blurry photo and lets it read as
          // low-light depth instead. The grain layer below does the rest.
          style={{ filter: 'contrast(1.08) saturate(1.12)' }}
        />
      </motion.div>

      {/* Film grain, sized in device pixels so it stays crisp on retina.
          Masks the softness of the upscaled source — without it the photo
          reads as out of focus rather than atmospheric. */}
      <div aria-hidden className="hero-grain absolute inset-0 -z-10" />

      {/* ── Layer 2: tone and legibility ────────────────────────────── */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-ink-950/30" />

      {/* Vertical wash: darkens under the nav, then resolves to the exact page
          background at the bottom so the photo has no visible bottom edge. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/85 via-ink-950/20 via-45% to-ink-950"
      />

      {/* Horizontal wash: gives the left-aligned copy a dark bed to sit on
          without dimming the hologram on the right. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950 via-ink-950/55 to-transparent lg:via-ink-950/35"
      />

      {/* Vignette, and a final bottom fade as insurance for tall viewports. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 85% at 50% 45%, transparent 35%, rgba(10, 10, 26, 0.75) 100%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink-950 to-transparent"
      />

      {/* ── Layer 3: parallax particle fields ───────────────────────── */}
      {!prefersReducedMotion &&
        PARTICLE_LAYERS.map((layer) => (
          <ParticleField key={layer.seed} layer={layer} px={px} py={py} />
        ))}

      {/* ── Layer 4: cursor bloom ───────────────────────────────────── */}
      {!prefersReducedMotion && (
        <motion.div
          aria-hidden
          style={{ left: bloomLeft, top: bloomTop }}
          className="pointer-events-none absolute -z-10 hidden h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen lg:block"
        >
          <div
            className="h-full w-full rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(34, 211, 238, 0.16) 0%, rgba(34, 211, 238, 0.06) 40%, transparent 70%)',
            }}
          />
        </motion.div>
      )}

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-7xl px-6 py-28 lg:px-10 lg:py-32">
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.11, delayChildren: 0.05 }}
          className="max-w-2xl"
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-glow-400/25 bg-glow-400/[0.07] px-4 py-1.5 text-xs font-medium tracking-wide text-glow-200 backdrop-blur-sm"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-glow-300 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-glow-300" />
            </span>
            Agentic AI tutor · Qiskit simulation · Live demo
          </motion.div>

          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-gradient-quantum text-6xl font-bold leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl"
          >
            QuantumIQ
          </motion.h1>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-gray-300/90 sm:text-xl"
          >
            Learn quantum computing through an interactive AI tutor and live
            circuit simulator.
          </motion.p>

          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <a
              href="#demo"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-glow-400 to-quantum-500 px-7 py-3.5 text-sm font-semibold text-ink-950 shadow-glow-md outline-none transition-shadow duration-300 hover:shadow-glow-lg focus-visible:ring-2 focus-visible:ring-glow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950"
            >
              Try the Demo
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-gray-200 backdrop-blur-sm outline-none hover:border-glow-400/40 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-glow-300"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </motion.div>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 text-sm text-gray-500"
          >
            No signup required — the simulator runs entirely in your browser.
          </motion.p>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <a
        href="#features"
        aria-label="Scroll to features"
        className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 text-gray-500 outline-none hover:text-glow-300 focus-visible:text-glow-300 lg:block"
      >
        <ChevronDown className="h-6 w-6 animate-scroll-cue" />
      </a>
    </section>
  );
}

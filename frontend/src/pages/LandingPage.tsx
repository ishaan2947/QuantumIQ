/**
 * Public landing page.
 *
 * Rendered outside ProtectedRoute and outside CircuitProvider — nothing here
 * needs an account or the Lab's circuit context, which is what lets a stranger
 * use the simulator and the tutor without signing up.
 *
 * DemoSection is code-split because it pulls in Three.js, @react-three/fiber
 * and drei — several hundred KB that has no business blocking the hero from
 * painting. It loads while the visitor reads the top of the page.
 */

import { Suspense, lazy, useEffect } from 'react';

import FeatureCards from '../components/landing/FeatureCards';
import Footer from '../components/landing/Footer';
import Hero from '../components/landing/Hero';
import LandingNav from '../components/landing/LandingNav';
import { warmUpBackend } from '../services/demoApi';

const DemoSection = lazy(() => import('../components/landing/DemoSection'));

/** Reserves the demo's real height so the page doesn't jump when it loads. */
function DemoFallback() {
  return (
    <section id="demo" className="scroll-mt-16 border-t border-ink-700/40 bg-ink-950">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-28">
        <div className="mx-auto h-8 w-64 animate-pulse rounded-lg bg-ink-800" />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          <div className="h-[28rem] animate-pulse rounded-2xl border border-ink-700/60 bg-ink-900/50 lg:col-span-2" />
          <div className="h-[28rem] animate-pulse rounded-2xl border border-ink-700/60 bg-ink-900/50" />
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  // Wake the Render free instance as soon as the page loads. It takes ~50s to
  // come back from a cold start, and a visitor typically spends longer than
  // that on the hero and the simulator before reaching the tutor — so the
  // wait usually happens invisibly, in parallel with them reading.
  useEffect(() => {
    warmUpBackend();
  }, []);

  return (
    <div className="min-h-screen bg-ink-950">
      <LandingNav />
      <main>
        <Hero />
        <FeatureCards />
        <Suspense fallback={<DemoFallback />}>
          <DemoSection />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

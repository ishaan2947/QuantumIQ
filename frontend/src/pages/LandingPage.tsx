/**
 * Public landing page.
 *
 * Rendered outside ProtectedRoute and outside CircuitProvider — nothing here
 * needs an account or the Lab's circuit context, which is what lets a stranger
 * use the simulator and the tutor without signing up.
 *
 * Three sections, in this order on purpose: the hardware, the working
 * instrument, and then the explanation of what runs where. There is no feature
 * section, because the features are operable 200px into the page.
 *
 * DemoSection is code-split because it pulls in Three.js, @react-three/fiber
 * and drei — several hundred KB that has no business blocking the hero from
 * painting. It loads while the visitor reads the top of the page.
 */

import { Suspense, lazy, useEffect } from 'react';

import Footer from '../components/landing/Footer';
import Hero from '../components/landing/Hero';
import HowItWorks from '../components/landing/HowItWorks';
import LandingNav from '../components/landing/LandingNav';
import { warmUpBackend } from '../services/demoApi';

const DemoSection = lazy(() => import('../components/landing/DemoSection'));

/**
 * Reserves the console's real height and shape so the page doesn't jump when
 * it loads. Matches the real layout's seams rather than being three identical
 * rounded rectangles: a loading state that resolves into a different shape is
 * worse than no loading state at all.
 */
function ConsoleFallback() {
  return (
    <section id="console" className="scroll-mt-12 border-t border-rule bg-void-lift">
      <div className="mx-auto max-w-console px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-5 flex items-baseline justify-between border-b border-rule pb-3">
          <h2 className="font-display text-h3 font-medium text-ink-primary">The console</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            initialising…
          </span>
        </div>

        <div className="overflow-hidden rounded-panel border border-rule-strong">
          <div className="grid gap-px bg-rule lg:grid-cols-3">
            <div className="h-[30rem] bg-panel lg:col-span-2" />
            <div className="h-[32rem] bg-panel lg:row-span-2" />
            <div className="h-[26rem] bg-panel" />
            <div className="h-[26rem] bg-panel" />
          </div>
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
    <div className="min-h-screen bg-void">
      <LandingNav />
      <main>
        <Hero />
        <Suspense fallback={<ConsoleFallback />}>
          <DemoSection />
        </Suspense>
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}

'use client';

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-black px-4 py-20 text-slate-100">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      <main className="relative z-10 w-full max-w-4xl space-y-16">
        <header className="text-center sm:text-left">
          <p className="text-sm uppercase tracking-[0.6em] text-slate-400">
            Phone Tag Labs
          </p>
          <h1 className="mt-6 text-4xl font-black leading-tight sm:text-6xl">
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-fuchsia-400 bg-clip-text text-transparent animate-gradient">
              Laser tag powered by AI vision.
            </span>
          </h1>
          <p className="mt-4 text-lg text-slate-300 sm:text-xl">
            Phone Tag Labs uses real-time computer vision to track every hit, every
            player, and every brag-worthy moment. Host a lobby, invite your
            squad, and get ready to duel.
          </p>
          
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Link
              href="/create"
              className="w-full rounded-full bg-emerald-500 px-8 py-3 text-base font-semibold text-emerald-950 transition-all duration-300 hover:bg-emerald-400 hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 sm:w-auto text-center"
            >
              Make a game
            </Link>
            <Link
              href="/join"
              className="w-full rounded-full border border-slate-700/60 px-8 py-3 text-base font-semibold text-slate-200 transition-all duration-300 hover:border-slate-500 hover:ring-2 hover:ring-slate-500/50 hover:scale-105 hover:shadow-[0_0_20px_rgba(148,163,184,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200 sm:w-auto text-center"
            >
              Join with a code
            </Link>
            <Link
              href="/stream"
              className="w-full rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-8 py-3 text-base font-semibold text-fuchsia-100 transition-all duration-300 hover:border-fuchsia-300 hover:bg-fuchsia-500/20 hover:scale-105 hover:shadow-[0_0_30px_rgba(217,70,239,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-200 sm:w-auto text-center"
            >
              Join as streamer
            </Link>
          </div>
        </header>
        <section className="grid gap-6 sm:grid-cols-3">
          <div className="group rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur transition-all duration-300 hover:border-emerald-500/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:scale-105 cursor-pointer">
            <p className="text-sm uppercase tracking-[0.4em] text-emerald-300 group-hover:text-emerald-200 transition-colors">
              Vision
            </p>
            <p className="mt-2 text-base text-slate-200">
              AI-assisted targeting boxes keep every duel fair and every shot
              accounted for.
            </p>
          </div>
          <div className="group rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur transition-all duration-300 hover:border-sky-500/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(14,165,233,0.15)] hover:scale-105 cursor-pointer">
            <p className="text-sm uppercase tracking-[0.4em] text-sky-300 group-hover:text-sky-200 transition-colors">
              Instant lobbies
            </p>
            <p className="mt-2 text-base text-slate-200">
              Host a match in seconds and share the auto-generated code with
              your crew.
            </p>
          </div>
          <div className="group rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur transition-all duration-300 hover:border-fuchsia-500/40 hover:bg-white/10 hover:shadow-[0_0_30px_rgba(217,70,239,0.15)] hover:scale-105 cursor-pointer">
            <p className="text-sm uppercase tracking-[0.4em] text-fuchsia-300 group-hover:text-fuchsia-200 transition-colors">
              Live scoreboard
            </p>
            <p className="mt-2 text-base text-slate-200">
              Watch players join in real time and get ready for the showdown.
            </p>
          </div>
        </section>
        <footer className="text-center text-xs text-slate-500 sm:text-left">
          Prototype built for hackathons. Hardware, computer vision, and battle
          mechanics coming soon.
        </footer>
      </main>
    </div>
  );
}

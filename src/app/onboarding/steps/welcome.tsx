'use client'

interface WelcomeProps {
  onNext: () => void
}

export function Welcome({ onNext }: WelcomeProps) {
  return (
    <main className="relative min-h-screen w-full flex items-center justify-center p-6 md:p-12">
      {/* Background Ambient Texture */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[40%] -right-[5%] w-[40%] h-[50%] rounded-full bg-secondary/5 blur-[100px]" />
      </div>

      {/* Onboarding Canvas */}
      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Branding & Messaging */}
        <div className="lg:col-span-7 flex flex-col items-start space-y-12">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <span className="font-display italic text-3xl text-primary leading-none">Feathr</span>
            <div className="h-px w-8 bg-outline-variant/30 mt-1" />
            <span className="font-body text-xs uppercase tracking-widest text-on-surface-variant/60">Marketing Atelier</span>
          </div>

          {/* Hero Section */}
          <div className="space-y-6 max-w-xl">
            <h1 className="font-display text-6xl md:text-8xl leading-[0.95] text-on-surface tracking-tight italic">
              Welcome to your Atelier
            </h1>
            <p className="font-body text-lg md:text-xl text-on-surface-variant leading-relaxed max-w-lg">
              The definitive AI-powered creative engine built for independent creators. Refine your brand, orchestrate campaigns, and cultivate your audience with surgical precision.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
            <button
              onClick={onNext}
              className="gradient-cta text-on-primary font-body font-semibold py-4 px-10 rounded-md transition-transform active:scale-95 duration-150 ease-in-out shadow-xl shadow-primary/10"
            >
              Get Started
            </button>
            <button className="font-body text-sm tracking-tight text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center gap-2">
              View how it works
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Right Column: Abstract Visual Composition */}
        <div className="lg:col-span-5 hidden lg:block relative">
          <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-surface-container-low shadow-2xl shadow-black/40">
            <img
              className="w-full h-full object-cover opacity-60 mix-blend-luminosity grayscale"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAk3W8hWD4atUvym4hYYRZgr_DaHYSDGsQZsj4ynrzFJHGro3hjXGus3m76P638dQ4MSQcpyfxrrXRMp2jAF4xBMT5XEWkYMgfMR80LQAXdpxR8kj-pT_T2h53kKJlVNQtE-mAr28fsGkrOf-JR0A12yPxwceQm0UPt7YGGlitcuijEoEmRos19a215hEoexAgM2pIqLxyHLZhvgHg9bWVyUQs6PprcvV4Ln-gxlyeYWu0ibq4b_8WzJEoavfbMz3v92h0pZiZ8Ow16"
              alt="Minimalist architectural abstract"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />

            {/* Floating Insight Card */}
            <div className="absolute bottom-8 left-8 right-8 p-6 backdrop-blur-xl bg-surface-container-high/60 rounded-xl border border-outline-variant/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                </div>
                <span className="font-body text-xs uppercase tracking-wider text-on-surface-variant">Intelligent Insight</span>
              </div>
              <p className="font-display italic text-xl text-on-surface leading-snug">
                &ldquo;Marketing is no longer about volume; it is about the poetry of resonance.&rdquo;
              </p>
            </div>
          </div>

          {/* Decorative Asymmetry Elements */}
          <div className="absolute -top-6 -right-6 w-32 h-32 border-t border-r border-outline-variant/20 rounded-tr-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 font-display text-[12rem] text-primary/5 pointer-events-none select-none">F</div>
        </div>
      </div>

      {/* Footer Utilities */}
      <div className="absolute bottom-10 left-10 lg:left-24 flex items-center gap-8 z-20">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <div className="w-1.5 h-1.5 rounded-full bg-surface-container-highest" />
          <div className="w-1.5 h-1.5 rounded-full bg-surface-container-highest" />
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/40 font-body">Step 01 / 08</span>
      </div>
    </main>
  )
}

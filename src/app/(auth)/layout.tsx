export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface text-on-surface font-body selection:bg-primary-container selection:text-on-primary-container min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Layer with Dark Silk Texture */}
      <div
        className="fixed inset-0 z-0 opacity-40 mix-blend-overlay pointer-events-none bg-cover bg-center"
        style={{
          backgroundImage:
            'url(https://lh3.googleusercontent.com/aida-public/AB6AXuCkVtO5yP85ntA5C18hjLH9KjHgw0pM0wv24lvCN4D6PRny3hC5Vdj_TWlRhU4oPWY5R-kgrvnkUAS4KPLUIElK7tBV7uTpYrryF9Fa2WyLXDX6-ueq8OzkthjsF2cecT6cPf3qkCyCT4MChIl2ZHA17ZWW73Su5YxwS5H7YlX0S9aNgTQS3Wfu3x1plX6MCXm0-C8qgc5i5QatfCVqnfRRp1BpUCqElsYU8Hy4s-HMsPYYVpMNZJ0kF5_Lm9EQ1XScfGgbkAc2WDAv)',
        }}
      />
      {/* Subtle Gradient Glow */}
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,_rgba(254,187,203,0.05)_0%,_transparent_70%)] pointer-events-none" />

      <main className="relative z-10 w-full max-w-md px-6">
        {children}
      </main>

      {/* Bottom Decorative Accent */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>
  )
}

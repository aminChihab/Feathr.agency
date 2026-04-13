export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-surface text-on-surface font-body">
      {children}
    </div>
  )
}

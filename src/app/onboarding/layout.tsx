import { SilkBackground } from '@/components/ui/silk-background-animation'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SilkBackground>
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-2xl">{children}</div>
      </div>
    </SilkBackground>
  )
}

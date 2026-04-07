import { SilkBackground } from '@/components/ui/silk-background-animation'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SilkBackground>
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </SilkBackground>
  )
}

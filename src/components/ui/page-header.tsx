interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode // slot for action buttons
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="px-6 pt-10 pb-6 md:px-10 md:pt-14 md:pb-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl md:text-7xl font-display font-bold text-on-surface tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-base md:text-lg text-on-surface-variant">
              {subtitle}
            </p>
          )}
        </div>
        {children && <div className="flex items-center gap-3 shrink-0">{children}</div>}
      </div>
    </div>
  )
}

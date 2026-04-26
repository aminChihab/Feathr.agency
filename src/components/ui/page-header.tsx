interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode // slot for action buttons
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="px-4 pt-6 pb-4 md:px-6 md:pt-8 md:pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-on-surface">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-base text-on-surface-variant">
              {subtitle}
            </p>
          )}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  )
}

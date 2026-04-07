'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
  className?: string
}

export function ProgressBar({ currentStep, totalSteps, className }: ProgressBarProps) {
  const percentage = ((currentStep - 1) / (totalSteps - 1)) * 100

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2 flex justify-between text-sm text-text-secondary">
        <span>Step {currentStep} of {totalSteps}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-bg-elevated">
        <div
          className="h-1.5 rounded-full bg-accent transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

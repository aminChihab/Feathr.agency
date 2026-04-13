'use client'

import { Button } from '@/components/ui/button'

interface WelcomeProps {
  onNext: () => void
}

export function Welcome({ onNext }: WelcomeProps) {
  return (
    <div className="space-y-8 text-center">
      <div className="space-y-4">
        <h1 className="font-display text-5xl text-on-surface">
          Welcome to your Atelier
        </h1>
        <p className="text-lg text-on-surface-variant">
          Your AI-powered marketing team. In 15 minutes, your entire agency will be up and running.
        </p>
      </div>

      <div className="space-y-3 text-left text-on-surface-variant">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-primary">1</span>
          <p>Tell us about yourself and how you communicate</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-primary">2</span>
          <p>Connect your platforms — social media, directories, and more</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-primary">3</span>
          <p>Upload your content and set your posting schedule</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-primary">4</span>
          <p>Launch — your assistants take it from here</p>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={onNext}
          className="gradient-cta px-8 text-white"
          size="lg"
        >
          Get Started
        </Button>
        <p>
          <button className="text-sm text-on-surface-variant hover:text-on-surface transition-colors">
            View how it works
          </button>
        </p>
      </div>
    </div>
  )
}

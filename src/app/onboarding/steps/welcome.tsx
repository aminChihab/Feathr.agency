'use client'

import { Button } from '@/components/ui/button'

interface WelcomeProps {
  onNext: () => void
}

export function Welcome({ onNext }: WelcomeProps) {
  return (
    <div className="space-y-8 text-center">
      <div className="space-y-4">
        <h1 className="text-5xl font-light tracking-tight">
          Welcome to Feathr
        </h1>
        <p className="text-lg text-text-secondary">
          Your AI-powered marketing team. In 15 minutes, your entire agency will be up and running.
        </p>
      </div>

      <div className="space-y-3 text-left text-text-secondary">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-accent">1</span>
          <p>Tell us about yourself and how you communicate</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-accent">2</span>
          <p>Connect your platforms — social media, directories, and more</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-accent">3</span>
          <p>Upload your content and set your posting schedule</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-accent">4</span>
          <p>Launch — your assistants take it from here</p>
        </div>
      </div>

      <Button
        onClick={onNext}
        className="bg-accent px-8 text-white hover:bg-accent-hover"
        size="lg"
      >
        Get started
      </Button>
    </div>
  )
}

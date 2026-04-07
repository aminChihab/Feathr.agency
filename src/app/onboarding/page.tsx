'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Welcome } from './steps/welcome'
import { Profile } from './steps/profile'
import { Voice } from './steps/voice'
import { ChatHistory } from './steps/chat-history'
import { SelectPlatforms } from './steps/select-platforms'
import { ConnectPlatforms } from './steps/connect-platforms'
import { MediaUpload } from './steps/media-upload'
import { Launch } from './steps/launch'

const TOTAL_STEPS = 8

export default function OnboardingPage() {
  const [step, setStep] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadStep() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_step, status')
        .eq('id', user.id)
        .single()

      if (profile?.status === 'active' || profile?.status === 'paused') {
        router.push('/dashboard')
        return
      }

      setStep(profile?.onboarding_step ?? 1)
    }
    loadStep()
  }, [])

  async function advanceStep() {
    const nextStep = (step ?? 1) + 1
    if (nextStep <= TOTAL_STEPS) {
      await supabase
        .from('profiles')
        .update({ onboarding_step: nextStep })
        .eq('id', userId!)
      setStep(nextStep)
    }
  }

  function goBack() {
    if (step && step > 1) {
      setStep(step - 1)
    }
  }

  if (step === null || !userId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const stepProps = { userId, supabase, onNext: advanceStep, onBack: goBack }

  return (
    <div className="space-y-8">
      {step > 1 && <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />}

      {step === 1 && <Welcome onNext={advanceStep} />}
      {step === 2 && <Profile {...stepProps} />}
      {step === 3 && <Voice {...stepProps} />}
      {step === 4 && <ChatHistory {...stepProps} />}
      {step === 5 && (
        <SelectPlatforms
          {...stepProps}
          selectedPlatforms={selectedPlatforms}
          setSelectedPlatforms={setSelectedPlatforms}
        />
      )}
      {step === 6 && (
        <ConnectPlatforms
          {...stepProps}
          selectedPlatforms={selectedPlatforms}
        />
      )}
      {step === 7 && <MediaUpload {...stepProps} />}
      {step === 8 && <Launch {...stepProps} />}
    </div>
  )
}

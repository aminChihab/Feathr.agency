'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { FileDropzone } from '@/components/ui/file-dropzone'

interface ChatHistoryProps {
  userId: string
  supabase: SupabaseClient<Database>
  onNext: () => void
  onBack: () => void
  currentStep: number
  totalSteps: number
}

interface UploadedFile {
  name: string
  path: string
}

export function ChatHistory({ userId, supabase, onNext, onBack, currentStep, totalSteps }: ChatHistoryProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFilesAdded(newFiles: File[]) {
    setUploading(true)
    setError(null)

    for (const file of newFiles) {
      if (files.length >= 20) break

      const path = `${userId}/${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('chat-history')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        setError(`Failed to upload ${file.name}: ${uploadError.message}`)
        continue
      }

      setFiles((prev) => [...prev, { name: file.name, path }])
    }

    setUploading(false)
  }

  async function removeFile(path: string) {
    await supabase.storage.from('chat-history').remove([path])
    setFiles((prev) => prev.filter((f) => f.path !== path))
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-12 md:py-24">
      <div className="w-full max-w-6xl flex flex-col gap-16 items-center">
        {/* Progress Indicator */}
        <div className="flex flex-col items-center gap-4 w-full max-w-md">
          <div className="flex justify-between w-full mb-1">
            <span className="text-xs tracking-widest text-on-surface-variant font-body">ONBOARDING JOURNEY</span>
            <span className="text-xs tracking-widest text-primary font-body">STEP 4 OF 8</span>
          </div>
          <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full gradient-cta w-1/2" />
          </div>
        </div>

        {/* Editorial Header */}
        <div className="text-center max-w-2xl">
          <h1 className="font-display text-5xl md:text-6xl text-on-surface mb-6 leading-tight">Your Digital Resonance</h1>
          <p className="text-on-surface-variant text-lg leading-relaxed">
            Upload your WhatsApp history to train the AI on your unique cadence, linguistic quirks, and emotional subtext. Your data remains encrypted and ephemeral.
          </p>
        </div>

        {error && (
          <div className="w-full max-w-6xl rounded-lg bg-error-container/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        {/* Bento Grid Onboarding Content */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full">
          {/* Upload Section */}
          <div className="md:col-span-7 bg-surface-container-low rounded-xl p-8 flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">chat_paste_go</span>
              <h2 className="text-xl font-semibold text-on-surface">Source Chat Data</h2>
            </div>

            <FileDropzone
              accept=".txt"
              maxFiles={20 - files.length}
              onFilesAdded={handleFilesAdded}
              className="group relative border-2 border-dashed border-outline-variant/30 rounded-xl p-12 flex flex-col items-center justify-center transition-all hover:border-primary/50 hover:bg-surface-container-highest/20 bg-transparent"
            >
              <div className="gradient-cta p-4 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-2xl shadow-primary/20">
                <span className="material-symbols-outlined text-on-primary text-3xl">upload_file</span>
              </div>
              <span className="text-on-surface font-semibold text-lg">
                {uploading ? 'Uploading...' : 'Drop WhatsApp .txt export here'}
              </span>
              <span className="text-on-surface-variant text-sm mt-2 italic">Export &gt; Without Media &gt; Upload .txt</span>
            </FileDropzone>

            {/* Uploaded files list */}
            {files.length > 0 && (
              <div className="flex flex-col gap-3">
                <label className="text-sm font-body text-on-surface-variant ml-1">{files.length} file(s) uploaded</label>
                <div className="flex flex-wrap gap-3">
                  {files.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => removeFile(file.path)}
                      className="px-5 py-2.5 rounded-lg bg-surface-container-high border border-outline-variant/20 text-on-surface text-sm transition-all hover:border-error hover:text-error"
                    >
                      {file.name} &times;
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Analysis Preview */}
          <div className="md:col-span-5 flex flex-col gap-6">
            <div className="bg-surface-container-highest rounded-xl p-8 flex flex-col h-full relative overflow-hidden group">
              {/* Background Abstract Graphic */}
              <div className="absolute -right-20 -top-20 w-64 h-64 gradient-cta opacity-10 rounded-full blur-[80px]" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-on-surface font-semibold">Live Extraction</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] tracking-widest uppercase text-primary">Scanning...</span>
                  </div>
                </div>

                {/* Tonal Quirks Visualization */}
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-on-surface-variant font-body">
                      <span>SENTENCE LENGTH</span>
                      <span>78% Concise</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-on-surface-variant/30 w-[78%]" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-on-surface-variant font-body">
                      <span>EMOTIONAL RESONANCE</span>
                      <span>High Warmth</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full gradient-cta w-[92%]" />
                    </div>
                  </div>

                  {/* Extracted Quirks */}
                  <div className="pt-4 flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-surface-container-low rounded-full text-xs border border-outline-variant/10">Uses &quot;...&quot; for pauses</span>
                    <span className="px-3 py-1 bg-surface-container-low rounded-full text-xs border border-outline-variant/10">Frequent emoji bursts</span>
                    <span className="px-3 py-1 bg-surface-container-low rounded-full text-xs border border-outline-variant/10">Lowercase emphasis</span>
                    <span className="px-3 py-1 bg-surface-container-low rounded-full text-xs border border-outline-variant/10">Late night activity</span>
                  </div>

                  {/* Message Preview */}
                  <div className="mt-8 p-4 bg-surface-container-lowest/50 rounded-lg border border-outline-variant/10 italic text-sm text-on-surface-variant">
                    &ldquo;Wait, that&apos;s actually brilliant... let&apos;s hop on a call?&rdquo;
                    <div className="mt-2 text-[10px] not-italic opacity-50 uppercase tracking-tighter">AI-Generated Resonance Match</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy & Action */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-8 pt-8 border-t border-outline-variant/10">
          <div className="flex items-center gap-4 text-on-surface-variant">
            <span className="material-symbols-outlined text-2xl">lock_open</span>
            <div>
              <p className="text-sm font-semibold text-on-surface">End-to-End Encryption</p>
              <p className="text-xs">Your data is processed on-device and never stored permanently on our servers.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={onNext} className="px-8 py-4 rounded-xl text-on-surface-variant hover:text-on-surface transition-colors font-body text-sm">
              Skip for now
            </button>
            <button
              onClick={onNext}
              disabled={uploading}
              className="px-10 py-4 rounded-xl gradient-cta text-on-primary font-semibold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center gap-2 disabled:opacity-50"
            >
              Confirm &amp; Continue
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Value Propositions Section */}
      <section className="w-full bg-surface-container-lowest py-20 px-6 mt-16">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col gap-4">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            <h4 className="font-display text-2xl italic">Authentic Echo</h4>
            <p className="text-on-surface-variant text-sm leading-relaxed">Feathr doesn&apos;t just write for you; it mimics your structural logic and vocabulary density for seamless identity.</p>
          </div>
          <div className="flex flex-col gap-4">
            <span className="material-symbols-outlined text-primary">diversity_3</span>
            <h4 className="font-display text-2xl italic">Contextual Tone</h4>
            <p className="text-on-surface-variant text-sm leading-relaxed">The system understands the difference between how you speak to a client versus a creative collaborator.</p>
          </div>
          <div className="flex flex-col gap-4">
            <span className="material-symbols-outlined text-primary">psychology</span>
            <h4 className="font-display text-2xl italic">Adaptive Memory</h4>
            <p className="text-on-surface-variant text-sm leading-relaxed">As you continue to use the platform, your voice profile evolves, sharpening its accuracy with every interaction.</p>
          </div>
        </div>
      </section>
    </main>
  )
}

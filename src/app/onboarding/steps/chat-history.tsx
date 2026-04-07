'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { FileDropzone } from '@/components/ui/file-dropzone'

interface ChatHistoryProps {
  userId: string
  supabase: SupabaseClient<Database>
  onNext: () => void
  onBack: () => void
}

interface UploadedFile {
  name: string
  path: string
}

export function ChatHistory({ userId, supabase, onNext, onBack }: ChatHistoryProps) {
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Chat history</h1>
        <p className="mt-2 text-text-secondary">
          Upload previous conversations with clients (.txt files). This helps the AI learn exactly how you communicate — your tone, humor, boundaries, and style.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-status-failed/10 px-4 py-3 text-sm text-status-failed">
          {error}
        </div>
      )}

      <FileDropzone
        accept=".txt"
        maxFiles={20 - files.length}
        onFilesAdded={handleFilesAdded}
      >
        <div className="space-y-2">
          <p className="text-text-secondary">
            {uploading ? 'Uploading...' : 'Drag & drop .txt files here, or click to browse'}
          </p>
          <p className="text-sm text-text-muted">Up to 20 files</p>
        </div>
      </FileDropzone>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-text-secondary">{files.length} file(s) uploaded</p>
          {files.map((file) => (
            <div
              key={file.path}
              className="flex items-center justify-between rounded-lg border border-border px-4 py-2"
            >
              <span className="text-sm truncate">{file.name}</span>
              <button
                onClick={() => removeFile(file.path)}
                className="text-sm text-text-muted hover:text-status-failed"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <div className="flex gap-3">
          {files.length === 0 && (
            <Button variant="ghost" onClick={onNext}>
              Skip for now
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={uploading}
            className="bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

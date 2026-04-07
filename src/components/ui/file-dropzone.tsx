'use client'

import { useCallback, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface FileDropzoneProps {
  accept: string
  maxFiles?: number
  maxSizeMB?: number
  onFilesAdded: (files: File[]) => void
  className?: string
  children?: React.ReactNode
}

export function FileDropzone({
  accept,
  maxFiles = 20,
  maxSizeMB = 50,
  onFilesAdded,
  className,
  children,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (fileList: FileList) => {
      const acceptedExtensions = accept.split(',').map((a) => a.trim().toLowerCase())
      const maxBytes = maxSizeMB * 1024 * 1024

      const validFiles = Array.from(fileList).filter((file) => {
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        const matchesType = acceptedExtensions.some(
          (a) => a === ext || file.type.match(a.replace('*', '.*'))
        )
        return matchesType && file.size <= maxBytes
      })

      onFilesAdded(validFiles.slice(0, maxFiles))
    },
    [accept, maxFiles, maxSizeMB, onFilesAdded]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors',
        isDragging && 'border-accent bg-accent/5',
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />
      {children || (
        <p className="text-text-secondary">
          Drag & drop files here, or click to browse
        </p>
      )}
    </div>
  )
}

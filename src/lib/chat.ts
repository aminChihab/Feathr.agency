export function extractParticipants(text: string): string[] {
  const names = new Set<string>()
  const patterns = [
    /^\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*[-–]\s*(.+?):\s/gm,
    /^\[\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\]\s*(.+?):\s/gm,
    /^\d{1,2}-\d{1,2}-\d{2,4}\s+\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*[-–]\s*(.+?):\s/gm,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim()
      if (name && name.length < 40 && !name.includes('changed') && !name.includes('created')) {
        names.add(name)
      }
    }
  }
  return Array.from(names)
}

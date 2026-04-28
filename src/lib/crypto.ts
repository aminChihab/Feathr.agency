import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const key = process.env.CREDENTIALS_ENCRYPTION_KEY
  if (!key) throw new Error('CREDENTIALS_ENCRYPTION_KEY not set')
  return Buffer.from(key, 'hex')
}

export function encryptCredentials(data: object): string {
  const key = getKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted,
    tag: authTag.toString('hex'),
  })
}

export function decryptCredentials(encrypted: string): any {
  // Support legacy plaintext (migration path)
  try {
    const parsed = JSON.parse(encrypted)
    if (parsed.iv && parsed.data && parsed.tag) {
      // Encrypted format
      const key = getKey()
      const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(parsed.iv, 'hex'))
      decipher.setAuthTag(Buffer.from(parsed.tag, 'hex'))
      let decrypted = decipher.update(parsed.data, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return JSON.parse(decrypted)
    }
    // Legacy plaintext JSON (has access_token directly)
    return parsed
  } catch {
    // Try as legacy plaintext
    try {
      return JSON.parse(encrypted)
    } catch {
      return {}
    }
  }
}

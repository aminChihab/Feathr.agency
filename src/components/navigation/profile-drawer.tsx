'use client'

import { X, Settings, CreditCard, HelpCircle, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ProfileDrawerProps {
  open: boolean
  onClose: () => void
  email?: string | null
  avatarUrl?: string | null
  profileName?: string | null
}

export function ProfileDrawer({ open, onClose, email, avatarUrl, profileName }: ProfileDrawerProps) {
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full md:w-80 bg-surface-container-high transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Close button */}
        <div className="flex justify-end p-4">
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <X size={20} />
          </button>
        </div>

        {/* Profile header */}
        <div className="flex items-center gap-3 px-6 pb-6">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-outline-variant/15">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-lg text-on-surface-variant">
                {(profileName || email || 'U').charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            {profileName && (
              <p className="text-sm font-medium text-on-surface">{profileName}</p>
            )}
            {email && (
              <p className="text-xs text-on-surface-variant">{email}</p>
            )}
          </div>
        </div>

        {/* Links */}
        <div className="border-t border-outline-variant/15 px-2 py-2">
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
          >
            <Settings size={18} />
            Settings
          </Link>
          <Link
            href="/settings?tab=billing"
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
          >
            <CreditCard size={18} />
            Billing
          </Link>
          <button
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
          >
            <HelpCircle size={18} />
            Support
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-outline-variant/15 px-2 py-2">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </div>
    </>
  )
}

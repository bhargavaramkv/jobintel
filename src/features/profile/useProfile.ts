import { createContext, useContext } from 'react'
import type { CandidateProfile } from '../../domain/profile/schema'

export type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; profile: CandidateProfile | null }
  | { status: 'error'; message: string }

export interface ProfileContextValue {
  state: LoadState
  /** Profile when loaded, otherwise null. */
  profile: CandidateProfile | null
  /** Increments when the record is replaced wholesale (import/clear), so editors can reset. */
  revision: number
  save: (profile: CandidateProfile) => Promise<CandidateProfile>
  replace: (profile: CandidateProfile | null) => Promise<void>
  clearAll: () => Promise<void>
}

export const ProfileContext = createContext<ProfileContextValue | null>(null)

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>')
  return ctx
}

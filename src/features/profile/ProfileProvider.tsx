import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CandidateProfile } from '../../domain/profile/schema'
import { profileRepository } from '../../storage/profileRepository'
import { clearUiPreferences } from '../../storage/uiPreferences'
import { ProfileContext, type LoadState, type ProfileContextValue } from './useProfile'

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let cancelled = false
    profileRepository
      .get()
      .then((profile) => !cancelled && setState({ status: 'ready', profile }))
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: err instanceof Error ? err.message : String(err) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const save = useCallback(async (profile: CandidateProfile) => {
    const saved = await profileRepository.save(profile)
    setState({ status: 'ready', profile: saved })
    return saved
  }, [])

  const clearAll = useCallback(async () => {
    await profileRepository.clearAll()
    clearUiPreferences()
    setState({ status: 'ready', profile: null })
    setRevision((r) => r + 1)
  }, [])

  const replace = useCallback(
    async (profile: CandidateProfile | null) => {
      if (!profile) return clearAll()
      const saved = await profileRepository.save(profile)
      setState({ status: 'ready', profile: saved })
      setRevision((r) => r + 1)
    },
    [clearAll],
  )

  const value = useMemo<ProfileContextValue>(
    () => ({
      state,
      profile: state.status === 'ready' ? state.profile : null,
      revision,
      save,
      replace,
      clearAll,
    }),
    [state, revision, save, replace, clearAll],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

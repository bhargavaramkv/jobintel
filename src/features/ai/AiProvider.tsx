import type { ReactNode } from 'react'
import { BriefingsProvider, ExportLogProvider, RecommendationsProvider } from './aiContext'

/** Mounts the three AI record stores under the profile provider. */
export function AiProvider({ children }: { children: ReactNode }) {
  return (
    <RecommendationsProvider>
      <BriefingsProvider>
        <ExportLogProvider>{children}</ExportLogProvider>
      </BriefingsProvider>
    </RecommendationsProvider>
  )
}

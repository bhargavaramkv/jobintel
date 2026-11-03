import type { ReactNode } from 'react'
import { AiSettingsProvider, BriefingsProvider, ExportLogProvider, RecommendationsProvider } from './aiContext'

/** Mounts the three AI record stores under the profile provider. */
export function AiProvider({ children }: { children: ReactNode }) {
  return (
    <RecommendationsProvider>
      <BriefingsProvider>
        <ExportLogProvider>
          <AiSettingsProvider>{children}</AiSettingsProvider>
        </ExportLogProvider>
      </BriefingsProvider>
    </RecommendationsProvider>
  )
}

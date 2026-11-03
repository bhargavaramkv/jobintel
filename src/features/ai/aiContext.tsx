import type { ExportRecord, StoredBriefing, StoredRecommendation } from '../../domain/ai/schema'
import { aiBriefingsRepository, aiExportsRepository, aiRecommendationsRepository } from '../../storage/aiRepository'
import { createRecordContext } from '../shared/recordContext'

/**
 * Providers and hooks over the three AI stores. They reload whenever local data is replaced
 * wholesale (backup import or "Clear data" bumps the profile revision), exactly like contacts
 * and outreach. `AiProvider` (AiProvider.tsx) nests the three providers.
 */
export const { Provider: RecommendationsProvider, useRecords: useRecommendationRecords } = createRecordContext<StoredRecommendation>(
  'AI recommendations',
  aiRecommendationsRepository,
)
export const { Provider: BriefingsProvider, useRecords: useBriefingRecords } = createRecordContext<StoredBriefing>(
  'AI briefings',
  aiBriefingsRepository,
)
export const { Provider: ExportLogProvider, useRecords: useExportLogRecords } = createRecordContext<ExportRecord>(
  'AI export log',
  aiExportsRepository,
)

/** Imported recommendations in this browser, keyed by id. */
export function useAiRecommendations() {
  const { items, ...rest } = useRecommendationRecords()
  return { recommendations: items, ...rest }
}

export function useAiBriefings() {
  const { items, ...rest } = useBriefingRecords()
  return { briefings: items, ...rest }
}

/** The consent log: what was exported, when. */
export function useAiExports() {
  const { items, ...rest } = useExportLogRecords()
  return { exports: items, ...rest }
}

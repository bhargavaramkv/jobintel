import { exportRecordSchema, storedBriefingSchema, storedRecommendationSchema } from '../domain/ai/schema'
import { STORES } from './db'
import { recordStore } from './recordStore'

/** Imported AI recommendations and their review state. Private; stored only in this browser. */
export const aiRecommendationsRepository = recordStore(STORES.aiRecommendations, storedRecommendationSchema)

/** Imported daily briefings. */
export const aiBriefingsRepository = recordStore(STORES.aiBriefings, storedBriefingSchema)

/** What was exported for AI processing and when (counts and switches only, no candidate data). */
export const aiExportsRepository = recordStore(STORES.aiExports, exportRecordSchema)

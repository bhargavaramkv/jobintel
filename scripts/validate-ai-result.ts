#!/usr/bin/env node
/**
 * Validates an AI result file with the SAME Zod contract the app uses, so the daily routine can fix
 * its own output before publishing it.
 *
 *   node scripts/validate-ai-result.ts <result.json> [--context <context.json>] [--feed <jobs.json>]
 *
 * Exit 0 only when the envelope is valid, no item is rejected, the briefing (if any) is valid, and
 * (with --context) the contextId matches and every jobId exists in the context or the feed.
 */
import { readFileSync } from 'node:fs'
import { parseAiResult } from '../src/domain/ai/import.ts'

const args = process.argv.slice(2)
const file = args[0]
const ctxIdx = args.indexOf('--context')
if (!file) {
  console.error('usage: node scripts/validate-ai-result.ts <result.json> [--context <context.json>]')
  process.exit(2)
}

const out = parseAiResult(readFileSync(file, 'utf8'))
if (!out.ok) {
  console.error(`INVALID: ${out.error}`)
  process.exit(1)
}
const r = out.value
const problems: string[] = []
for (const x of r.rejected) problems.push(`recommendation #${x.index + 1}${x.id ? ` (${x.id})` : ''}: ${x.messages.join('; ')}`)
for (const b of r.briefingIssues) problems.push(`briefing: ${b}`)

if (ctxIdx >= 0 && args[ctxIdx + 1]) {
  const ctx = JSON.parse(readFileSync(args[ctxIdx + 1], 'utf8')) as {
    contextId?: string
    pipeline?: Array<{ jobId?: string }>
    topMatches?: Array<{ jobId?: string }>
    applications?: { records?: Array<{ jobId?: string }> }
  }
  if (ctx.contextId && ctx.contextId !== r.contextId) problems.push(`contextId ${r.contextId} does not match the context (${ctx.contextId})`)
  const known = new Set(
    [...(ctx.pipeline ?? []), ...(ctx.topMatches ?? []), ...(ctx.applications?.records ?? [])].map((j) => j.jobId).filter(Boolean),
  )
  // Jobs first seen after the context was exported are valid too, if they are in the public feed.
  const feedIdx = args.indexOf('--feed')
  if (feedIdx >= 0 && args[feedIdx + 1]) {
    const feed = JSON.parse(readFileSync(args[feedIdx + 1], 'utf8')) as { jobs?: Array<{ id: string }> }
    for (const j of feed.jobs ?? []) known.add(j.id)
  }
  for (const rec of r.recommendations) {
    if (rec.jobId && known.size && !known.has(rec.jobId)) problems.push(`recommendation ${rec.id}: jobId ${rec.jobId} is in neither the context nor the feed`)
  }
}

if (problems.length) {
  console.error(`INVALID (${problems.length} problem(s)):\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log(`VALID: ${r.recommendations.length} recommendation(s)${r.briefing ? ' + briefing' : ''}, schema accepted.`)

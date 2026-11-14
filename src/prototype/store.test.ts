import { describe, expect, it } from 'vitest'
import { reducer, initialState, type Action } from './store'
import type { PrototypeState } from './types'

const run = (s: PrototypeState, ...actions: Action[]) => actions.reduce(reducer, s)
const ticks = (n: number): Action[] => Array.from({ length: n }, () => ({ type: 'agent/tick' }))
const demo = () => initialState('demo')

describe('prototype store', () => {
  it('runs a full simulated run: start, 8 ticks, idle with lastRunAt', () => {
    const before = demo().run.lastRunAt
    let s = run(demo(), { type: 'agent/start' })
    expect(s.run.status).toBe('running')
    s = run(s, ...ticks(8))
    expect(s.run.status).toBe('idle')
    expect(s.run.step).toBe(8)
    expect(s.run.lastRunAt).not.toBe(before)
    expect(s.events.length).toBeGreaterThan(demo().events.length + 8)
    expect(s.toasts.at(-1)?.message).toMatch(/Simulated/)
  })

  it('ignores ticks while paused and continues after resume', () => {
    let s = run(demo(), { type: 'agent/start' }, ...ticks(2), { type: 'agent/pause' })
    const paused = s
    s = run(s, ...ticks(3))
    expect(s.run.step).toBe(paused.run.step)
    expect(s.events).toBe(paused.events)
    s = run(s, { type: 'agent/resume' }, ...ticks(1))
    expect(s.run.step).toBe(3)
  })

  it('approving an awaiting application submits it and logs an event', () => {
    const s0 = demo()
    const target = s0.applications.find((a) => a.status === 'awaiting-approval')!
    const s = run(s0, { type: 'app/approve', id: target.id })
    const app = s.applications.find((a) => a.id === target.id)!
    expect(app.status).toBe('submitted')
    expect(app.history.at(-1)?.status).toBe('submitted')
    expect(s.events[0].applicationId).toBe(target.id)
    expect(s.toasts.at(-1)?.message).toMatch(/Simulated/)
    expect(s.events.some((e) => e.applicationId === target.id && e.needsIntervention && !e.resolved)).toBe(false)
  })

  it('does not auto-submit when the settings require approval', () => {
    const s0 = demo()
    const asked = { ...s0, settings: { ...s0.settings, automation: { ...s0.settings.automation, mode: 'approval' as const } } }
    const awaitingBefore = asked.applications.filter((a) => a.status === 'awaiting-approval').length
    const s = run(asked, { type: 'agent/start' }, ...ticks(8))
    const submittedBefore = new Set(asked.applications.filter((a) => a.status === 'submitted').map((a) => a.id))
    expect(s.applications.some((a) => a.status === 'submitted' && !submittedBefore.has(a.id))).toBe(false)
    expect(s.applications.filter((a) => a.status === 'awaiting-approval').length).toBeGreaterThan(awaitingBefore)
  })

  it('resolving a blocked event re-queues the application', () => {
    const s0 = demo()
    const blocked = s0.applications.find((a) => a.status === 'blocked')!
    const ev = s0.events.find((e) => e.applicationId === blocked.id && e.needsIntervention)!
    const s = run(s0, { type: 'event/resolve', id: ev.id })
    expect(s.events.find((e) => e.id === ev.id)?.resolved).toBe(true)
    expect(s.applications.find((a) => a.id === blocked.id)?.status).toBe('queued')
  })

  it('retries a failed application into the queue', () => {
    const s0 = demo()
    const failed = s0.applications.find((a) => a.status === 'failed')!
    const s = run(s0, { type: 'app/retry', id: failed.id })
    expect(s.applications.find((a) => a.id === failed.id)?.status).toBe('queued')
  })

  it('generates version n+1 for a resume variant', () => {
    const s0 = demo()
    const v = s0.resumes.variants[0]
    const s = run(s0, { type: 'resume/generate', resumeId: v.id })
    expect(s.resumes.variants[0].versions).toHaveLength(v.versions.length + 1)
    expect(s.resumes.variants[0].versions.at(-1)?.version).toBe(v.versions.at(-1)!.version + 1)
  })

  it('queues a job from discovery once', () => {
    const s0 = demo()
    const job = s0.jobs.find((j) => !s0.applications.some((a) => a.jobId === j.id))!
    const s = run(s0, { type: 'job/queue', jobId: job.id }, { type: 'job/queue', jobId: job.id })
    expect(s.applications.filter((a) => a.jobId === job.id)).toHaveLength(1)
    expect(s.applications[0].status).toBe('queued')
  })

  it('supports the empty scenario and reset', () => {
    let s = run(demo(), { type: 'scenario/set', scenario: 'empty' })
    expect(s.scenario).toBe('empty')
    expect(s.jobs).toHaveLength(0)
    expect(s.onboarded).toBe(false)
    s = run(s, { type: 'reset' })
    expect(s.scenario).toBe('empty')
    s = run(demo(), { type: 'agent/start' }, { type: 'reset' })
    expect(s.run.status).toBe('idle')
    expect(s.events).toEqual(demo().events)
  })
})

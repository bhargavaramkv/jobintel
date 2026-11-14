import { OctagonAlert, UserCheck, Zap } from 'lucide-react'
import type { AppMode } from '../../prototype/types'

const MODES = {
  auto: { text: 'Automatic', Icon: Zap, className: 'badge badge--accent' },
  approval: { text: 'Needs approval', Icon: UserCheck, className: 'badge badge--warning' },
  blocked: { text: 'Blocked', Icon: OctagonAlert, className: 'badge badge--danger' },
} as const

/** Text and icon, never colour alone. */
export function ModeBadge({ mode }: { mode: AppMode }) {
  const { text, Icon, className } = MODES[mode]
  return (
    <span className={className}>
      <Icon size={12} aria-hidden="true" />
      {text}
    </span>
  )
}

import { Building2, HelpCircle, Home, Laptop } from 'lucide-react'
import type { JobWorkMode } from '../../domain/jobs/feedSchema'

const MODES = {
  onsite: { text: 'Onsite', Icon: Building2 },
  hybrid: { text: 'Hybrid', Icon: Home },
  remote: { text: 'Remote', Icon: Laptop },
  unknown: { text: 'Mode not stated', Icon: HelpCircle },
} as const

/** Work mode as text and icon, never colour alone. */
export function ModeBadge({ mode }: { mode: JobWorkMode }) {
  const { text, Icon } = MODES[mode]
  return (
    <span className="badge">
      <Icon size={12} aria-hidden="true" />
      {text}
    </span>
  )
}

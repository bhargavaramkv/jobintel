import {
  Briefcase,
  ChartLine,
  LayoutDashboard,
  Radar,
  Send,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type NavItem =
  | { id: string; label: string; shortLabel: string; icon: LucideIcon; kind: 'active'; path: string }
  | { id: string; label: string; shortLabel: string; icon: LucideIcon; kind: 'planned'; phase: number }

/** Planned entries never route anywhere. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, kind: 'active', path: '/' },
  { id: 'discovery', label: 'Job Discovery', shortLabel: 'Jobs', icon: Radar, kind: 'active', path: '/jobs' },
  { id: 'referrals', label: 'Referrals', shortLabel: 'Refs', icon: Users, kind: 'active', path: '/referrals' },
  { id: 'outreach', label: 'Outreach', shortLabel: 'Reach', icon: Send, kind: 'active', path: '/outreach' },
  { id: 'applications', label: 'Applications', shortLabel: 'Apps', icon: Briefcase, kind: 'planned', phase: 6 },
  { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: ChartLine, kind: 'planned', phase: 8 },
  { id: 'profile', label: 'Profile & Preferences', shortLabel: 'Profile', icon: UserRound, kind: 'active', path: '/profile' },
]

export const PROFILE_SECTIONS = [
  { id: 'identity', label: 'Professional identity' },
  { id: 'skills', label: 'Technical skills' },
  { id: 'roles', label: 'Target roles' },
  { id: 'location', label: 'Location & work' },
  { id: 'company', label: 'Company & compensation' },
  { id: 'data', label: 'Data & privacy' },
] as const

export type ProfileSectionId = (typeof PROFILE_SECTIONS)[number]['id']

export function isProfileSection(value: string | null | undefined): value is ProfileSectionId {
  return PROFILE_SECTIONS.some((s) => s.id === value)
}

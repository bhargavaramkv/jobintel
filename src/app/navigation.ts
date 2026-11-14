import { FileText, LayoutDashboard, Radar, Rocket, Send, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  shortLabel: string
  path: string
  icon: LucideIcon
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home', path: '/', icon: LayoutDashboard },
  { id: 'onboarding', label: 'Setup', shortLabel: 'Setup', path: '/onboarding', icon: Rocket },
  { id: 'resumes', label: 'Resumes', shortLabel: 'Resumes', path: '/resumes', icon: FileText },
  { id: 'jobs', label: 'Jobs', shortLabel: 'Jobs', path: '/jobs', icon: Radar },
  { id: 'applications', label: 'Applications', shortLabel: 'Apply', path: '/applications', icon: Send },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', path: '/settings', icon: Settings },
]

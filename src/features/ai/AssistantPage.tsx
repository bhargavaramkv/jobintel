import { useSearchParams } from 'react-router-dom'
import { countByStatus } from '../../domain/ai/lifecycle'
import { useAiRecommendations } from './aiContext'
import { AutomationPanel } from './AutomationPanel'
import { BriefingPanel } from './BriefingPanel'
import { ExportPanel } from './ExportPanel'
import { InboxPanel } from './InboxPanel'
import './ai.css'

const TABS = [
  { id: 'briefing', label: 'Daily briefing' },
  { id: 'inbox', label: 'Recommendations' },
  { id: 'automation', label: 'Automation' },
  { id: 'bridge', label: 'Manual export & import' },
] as const
type TabId = (typeof TABS)[number]['id']
const isTab = (v: string | null): v is TabId => TABS.some((t) => t.id === v)

export function AssistantPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TabId = isTab(raw) ? raw : 'briefing'
  const { recommendations } = useAiRecommendations()
  const counts = countByStatus(recommendations.values())
  const pending = counts.generated + counts.reviewed

  return (
    <div className="ai">
      <header>
        <p className="eyebrow">AI assistant</p>
        <h1 className="ai__title">Claude proposes. You decide.</h1>
        <p className="secondary ai__lede">
          Recommendations come from a daily Claude routine on your own subscription (or a file you hand over yourself). Each one shows its evidence and confidence, is validated before it is
          shown, and changes your records only if you accept it. Nothing is ever applied to a job or sent to anyone automatically.
        </p>
      </header>

      <div className="tabs" role="tablist" aria-label="AI assistant sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`ai-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="ai-panel"
            className={tab === t.id ? 'tab is-active' : 'tab'}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
          >
            {t.label}
            {t.id === 'inbox' && pending > 0 && <span className="tab__count mono">{pending}</span>}
          </button>
        ))}
      </div>

      <div id="ai-panel" role="tabpanel" aria-labelledby={`ai-tab-${tab}`} className="ai__panel">
        {tab === 'briefing' && <BriefingPanel />}
        {tab === 'inbox' && <InboxPanel />}
        {tab === 'automation' && <AutomationPanel />}
        {tab === 'bridge' && <ExportPanel />}
      </div>
    </div>
  )
}

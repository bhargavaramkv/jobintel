import { PrototypeTag } from '../ui/PrototypeTag'

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="page-head">
      <div>
        <div className="page-head__row">
          <h1 className="page-head__title">{title}</h1>
          <PrototypeTag />
        </div>
        {subtitle && <p className="page-head__subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}

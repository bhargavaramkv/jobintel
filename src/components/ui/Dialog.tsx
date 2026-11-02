import { useId, useRef, type ReactNode } from 'react'
import { useDialogFocus } from './useDialogFocus'

interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  /** Disable closing while an async action runs. */
  busy?: boolean
  role?: 'dialog' | 'alertdialog'
}

export function Dialog({ open, title, onClose, children, footer, busy = false, role = 'dialog' }: DialogProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useDialogFocus(open, ref)
  if (!open) return null

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        ref={ref}
        className="dialog"
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy) {
            e.stopPropagation()
            onClose()
          }
        }}
      >
        <div className="dialog__header">
          <h2 id={titleId} className="panel__title">
            {title}
          </h2>
        </div>
        <div className="dialog__body">{children}</div>
        <div className="dialog__footer">{footer}</div>
      </div>
    </div>
  )
}

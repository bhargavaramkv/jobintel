import { useEffect } from 'react'
import { useApp } from '../../app/appContext'

const VISIBLE_MS = 5000

function ToastItem({ id, message }: { id: number; message: string }) {
  const { dismissToast } = useApp()
  useEffect(() => {
    const t = setTimeout(() => dismissToast(id), VISIBLE_MS)
    return () => clearTimeout(t)
  }, [dismissToast, id])
  return <div className="toast">{message}</div>
}

/** The single aria-live region for confirmations. */
export function ToastRegion() {
  const { toasts } = useApp()
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} message={t.message} />
      ))}
    </div>
  )
}

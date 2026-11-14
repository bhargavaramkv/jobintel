import { useEffect } from 'react'
import { usePrototype } from '../../prototype/usePrototype'

const VISIBLE_MS = 5000

function ToastItem({ id, message }: { id: number; message: string }) {
  const { dispatch } = usePrototype()
  useEffect(() => {
    const t = setTimeout(() => dispatch({ type: 'toast/dismiss', id }), VISIBLE_MS)
    return () => clearTimeout(t)
  }, [dispatch, id])
  return <div className="toast">{message}</div>
}

/** The single aria-live region for confirmations. */
export function ToastRegion() {
  const { state } = usePrototype()
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {state.toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} message={t.message} />
      ))}
    </div>
  )
}

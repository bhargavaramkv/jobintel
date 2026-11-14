import { useLocation } from 'react-router-dom'

/** Exposes the router location to tests. */
export function Location() {
  const { pathname, search } = useLocation()
  return <div data-testid="location">{pathname + search}</div>
}

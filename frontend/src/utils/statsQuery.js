export function statsQueryString(filters, timezone) {
  const p = new URLSearchParams()
  if (filters.startDate) p.set('startDate', filters.startDate)
  if (filters.endDate) p.set('endDate', filters.endDate)
  if (filters.pair?.trim()) p.set('pair', filters.pair.trim())
  if (filters.strategy?.trim()) p.set('strategy', filters.strategy.trim())
  if (timezone?.trim()) p.set('timezone', timezone.trim())
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function reportQueryString({ range, filters = {} }) {
  const p = new URLSearchParams()
  if (range) p.set('range', range)
  if (filters.startDate) p.set('startDate', filters.startDate)
  if (filters.endDate) p.set('endDate', filters.endDate)
  if (filters.pair?.trim()) p.set('pair', filters.pair.trim())
  if (filters.strategy?.trim()) p.set('strategy', filters.strategy.trim())
  const s = p.toString()
  return s ? `?${s}` : ''
}

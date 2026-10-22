const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' })
const dateTime = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })

export const money = (v: number | null | undefined) => (v == null ? '—' : brl.format(v))
export const percent = (v: number | null | undefined) => (v == null ? '—' : pct.format(v))
export const when = (iso: string | null | undefined) => (iso ? dateTime.format(new Date(iso)) : 'nunca')
export const dayLabel = (ts: number) => shortDate.format(new Date(ts))

// Converte preços em formatos variados ("R$ 1.234,56", "1234.56", 1234.56) para number.

export function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? round2(value) : null
  if (typeof value !== 'string') return null

  let s = value.replace(/[^\d.,]/g, '')
  if (!s) return null

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')

  if (lastComma > -1 && lastDot > -1) {
    // O separador que aparece por último é o decimal.
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (lastComma > -1) {
    s = isThousandsGroup(s, ',') ? s.replace(/,/g, '') : s.replace(/,/g, '.')
  } else if (lastDot > -1 && isThousandsGroup(s, '.')) {
    s = s.replace(/\./g, '')
  }

  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? round2(n) : null
}

// "1.234" ou "12.345.678" → separador de milhar; "12.5" ou "1234.56" → decimal.
function isThousandsGroup(s: string, sep: string): boolean {
  const parts = s.split(sep)
  return parts.length > 1 && parts.slice(1).every((p) => p.length === 3) && parts[0].length <= 3
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

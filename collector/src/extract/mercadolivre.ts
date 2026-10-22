import { parsePrice } from '../price.js'
import type { Extraction } from './types.js'

type FetchJson = (url: string) => Promise<unknown>

// Extrai o ID do anúncio (MLB-123… ou /p/MLB123…) da URL.
export function mercadoLivreItemId(rawUrl: string): { id: string; kind: 'item' | 'product' } | null {
  const product = rawUrl.match(/\/p\/(MLB\d+)/i)
  if (product) return { id: product[1].toUpperCase(), kind: 'product' }
  const item = rawUrl.match(/(MLB)-?(\d{6,})/i)
  if (item) return { id: `MLB${item[2]}`, kind: 'item' }
  return null
}

// Consulta a API pública do Mercado Livre. Se a API recusar (ex.: exigir token),
// retorna null e o coletor cai para a leitura do HTML.
export async function extractMercadoLivre(rawUrl: string, fetchJson: FetchJson): Promise<Extraction | null> {
  const ref = mercadoLivreItemId(rawUrl)
  if (!ref) return null

  try {
    if (ref.kind === 'item') {
      const item = (await fetchJson(`https://api.mercadolibre.com/items/${ref.id}`)) as {
        price?: unknown
        status?: string
        available_quantity?: number
      }
      const price = parsePrice(item.price)
      if (!price) return null
      return {
        price,
        inStock: item.status === 'active' && (item.available_quantity ?? 1) > 0,
        source: 'mercadolivre-api',
      }
    }

    const product = (await fetchJson(`https://api.mercadolibre.com/products/${ref.id}`)) as {
      buy_box_winner?: { price?: unknown } | null
    }
    const price = parsePrice(product.buy_box_winner?.price)
    if (!price) return null
    return { price, inStock: true, source: 'mercadolivre-api' }
  } catch {
    return null
  }
}

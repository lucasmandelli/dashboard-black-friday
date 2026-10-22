import type { CheerioAPI } from 'cheerio'
import { parsePrice } from '../price.js'
import type { Extraction } from './types.js'

const PRICE_SELECTORS = [
  'meta[property="product:price:amount"]',
  'meta[property="og:price:amount"]',
  'meta[itemprop="price"]',
  '[itemprop="price"][content]',
]

// Fallback: meta tags de Open Graph / microdata.
export function extractMeta($: CheerioAPI): Extraction | null {
  for (const selector of PRICE_SELECTORS) {
    const price = parsePrice($(selector).first().attr('content'))
    if (price) {
      const availability =
        $('meta[property="product:availability"]').attr('content') ??
        $('meta[property="og:availability"]').attr('content') ??
        $('[itemprop="availability"]').attr('href') ??
        $('[itemprop="availability"]').attr('content') ??
        ''
      const inStock = !/out.?of.?stock|oos|sold.?out/i.test(availability)
      return { price, inStock, source: 'meta' }
    }
  }
  return null
}

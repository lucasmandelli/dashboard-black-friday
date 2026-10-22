import { load } from 'cheerio'
import { isMercadoLivre } from '../../../shared/stores.js'
import { extractJsonLd } from './jsonld.js'
import { extractMercadoLivre } from './mercadolivre.js'
import { extractMeta } from './meta.js'
import type { Extraction } from './types.js'

export type { Extraction } from './types.js'

export interface Fetchers {
  fetchHtml: (url: string) => Promise<string>
  fetchJson: (url: string) => Promise<unknown>
}

// Extração só a partir de HTML (usada também nos testes).
export function extractFromHtml(html: string): Extraction | null {
  const $ = load(html)
  return extractJsonLd($) ?? extractMeta($)
}

export async function extractPrice(url: string, fetchers: Fetchers): Promise<Extraction> {
  if (isMercadoLivre(url)) {
    const fromApi = await extractMercadoLivre(url, fetchers.fetchJson)
    if (fromApi) return fromApi
  }

  const html = await fetchers.fetchHtml(url)
  const result = extractFromHtml(html)
  if (!result) {
    throw new Error('Preço não encontrado na página (a loja pode montar o preço via JavaScript ou bloquear robôs)')
  }
  return result
}

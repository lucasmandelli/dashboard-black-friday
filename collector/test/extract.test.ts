import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { storeFromUrl } from '../../shared/stores.js'
import { extractFromHtml, extractPrice } from '../src/extract/index.js'
import { mercadoLivreItemId } from '../src/extract/mercadolivre.js'
import { parsePrice } from '../src/price.js'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('parsePrice', () => {
  it.each([
    ['R$ 1.234,56', 1234.56],
    ['1.234,5', 1234.5],
    ['1234.56', 1234.56],
    ['1,234.56', 1234.56],
    ['R$ 699,00', 699],
    ['1.299', 1299],
    ['12.5', 12.5],
    ['2.499.990,00', 2499990],
    [1199.9, 1199.9],
  ])('%s → %s', (input, expected) => {
    expect(parsePrice(input)).toBe(expected)
  })

  it.each([['', null], ['grátis', null], [0, null], [null, null], ['0,00', null]])('%s → null', (input, expected) => {
    expect(parsePrice(input)).toBe(expected)
  })
})

describe('extractFromHtml', () => {
  it('lê Offer simples do JSON-LD (KaBuM!)', () => {
    expect(extractFromHtml(fixture('kabum.html'))).toEqual({ price: 1199.9, inStock: true, source: 'json-ld' })
  })

  it('usa @graph e prefere a oferta em estoque (Magalu)', () => {
    expect(extractFromHtml(fixture('magalu.html'))).toEqual({ price: 529.9, inStock: true, source: 'json-ld' })
  })

  it('usa lowPrice de AggregateOffer', () => {
    expect(extractFromHtml(fixture('aggregate.html'))?.price).toBe(3899)
  })

  it('ignora JSON-LD inválido e cai para microdata (Amazon)', () => {
    expect(extractFromHtml(fixture('amazon.html'))).toEqual({ price: 699, inStock: true, source: 'meta' })
  })

  it('lê meta tags de Open Graph com disponibilidade', () => {
    expect(extractFromHtml(fixture('og-meta.html'))).toEqual({ price: 349.99, inStock: false, source: 'meta' })
  })

  it('retorna null quando não há preço', () => {
    expect(extractFromHtml(fixture('no-price.html'))).toBeNull()
  })
})

describe('Mercado Livre', () => {
  it('reconhece IDs de anúncio e de produto de catálogo', () => {
    expect(mercadoLivreItemId('https://produto.mercadolivre.com.br/MLB-3456789012-fone-bluetooth-_JM')).toEqual({
      id: 'MLB3456789012',
      kind: 'item',
    })
    expect(mercadoLivreItemId('https://www.mercadolivre.com.br/fone/p/MLB19876543?pdp_filters=x')).toEqual({
      id: 'MLB19876543',
      kind: 'product',
    })
  })

  it('usa a API quando ela responde', async () => {
    const fetchJson = vi.fn().mockResolvedValue({ price: 259.9, status: 'active', available_quantity: 10 })
    const fetchHtml = vi.fn()
    const r = await extractPrice('https://produto.mercadolivre.com.br/MLB-3456789012-fone', { fetchJson, fetchHtml })
    expect(r).toEqual({ price: 259.9, inStock: true, source: 'mercadolivre-api' })
    expect(fetchJson).toHaveBeenCalledWith('https://api.mercadolibre.com/items/MLB3456789012')
    expect(fetchHtml).not.toHaveBeenCalled()
  })

  it('cai para o HTML quando a API recusa', async () => {
    const fetchJson = vi.fn().mockRejectedValue(new Error('HTTP 403'))
    const fetchHtml = vi.fn().mockResolvedValue(fixture('kabum.html'))
    const r = await extractPrice('https://produto.mercadolivre.com.br/MLB-3456789012-fone', { fetchJson, fetchHtml })
    expect(r.source).toBe('json-ld')
  })
})

describe('extractPrice', () => {
  it('lança erro descritivo quando a página não tem preço', async () => {
    const fetchHtml = vi.fn().mockResolvedValue(fixture('no-price.html'))
    await expect(extractPrice('https://www.kabum.com.br/produto/1', { fetchHtml, fetchJson: vi.fn() })).rejects.toThrow(
      /Preço não encontrado/,
    )
  })
})

describe('storeFromUrl', () => {
  it.each([
    ['https://www.kabum.com.br/produto/1', 'KaBuM!'],
    ['https://produto.mercadolivre.com.br/MLB-1', 'Mercado Livre'],
    ['https://www.amazon.com.br/dp/B0', 'Amazon'],
    ['https://www.lojinha.com.br/x', 'lojinha.com.br'],
    ['não é url', 'Desconhecida'],
  ])('%s → %s', (url, store) => {
    expect(storeFromUrl(url)).toBe(store)
  })
})

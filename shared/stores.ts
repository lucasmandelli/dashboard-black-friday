// Mapeamento domínio → nome da loja, usado pelo coletor e pelo dashboard.

const STORES: Array<[suffix: string, name: string]> = [
  ['amazon.com.br', 'Amazon'],
  ['mercadolivre.com.br', 'Mercado Livre'],
  ['mercadolibre.com', 'Mercado Livre'],
  ['kabum.com.br', 'KaBuM!'],
  ['magazineluiza.com.br', 'Magalu'],
  ['magalu.com', 'Magalu'],
  ['casasbahia.com.br', 'Casas Bahia'],
  ['pontofrio.com.br', 'Ponto'],
  ['extra.com.br', 'Extra'],
  ['americanas.com.br', 'Americanas'],
  ['submarino.com.br', 'Submarino'],
  ['shoptime.com.br', 'Shoptime'],
  ['pichau.com.br', 'Pichau'],
  ['terabyteshop.com.br', 'Terabyte'],
  ['fastshop.com.br', 'Fast Shop'],
  ['carrefour.com.br', 'Carrefour'],
  ['shopee.com.br', 'Shopee'],
  ['aliexpress.com', 'AliExpress'],
  ['netshoes.com.br', 'Netshoes'],
  ['centauro.com.br', 'Centauro'],
  ['leroymerlin.com.br', 'Leroy Merlin'],
]

export function storeFromUrl(rawUrl: string): string {
  let host: string
  try {
    host = new URL(rawUrl).hostname.toLowerCase()
  } catch {
    return 'Desconhecida'
  }
  for (const [suffix, name] of STORES) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return name
  }
  return host.replace(/^www\./, '')
}

export function isMercadoLivre(rawUrl: string): boolean {
  return storeFromUrl(rawUrl) === 'Mercado Livre'
}

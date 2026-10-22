import { createClient } from '@supabase/supabase-js'
import { parseArgs } from 'node:util'
import { extractPrice } from './extract/index.js'
import { fetchHtml, fetchJson, sleep } from './http.js'

const DELAY_PER_HOST_MS = 2_500

interface LinkRow {
  id: string
  url: string
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      url: { type: 'string', multiple: true },
    },
  })

  // Modo teste: `npm run collect -- --dry-run --url <url>` só mostra o preço extraído.
  if (values.url?.length) {
    for (const url of values.url) {
      try {
        const r = await extractPrice(url, { fetchHtml, fetchJson })
        console.log(`✔ ${url}\n  R$ ${r.price.toFixed(2)} | ${r.inStock ? 'em estoque' : 'sem estoque'} | via ${r.source}`)
      } catch (err) {
        console.log(`✘ ${url}\n  ${(err as Error).message}`)
        process.exitCode = 1
      }
    }
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL
  // Secret key (sb_secret_…); a antiga service_role key continua aceita.
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Defina SUPABASE_URL e SUPABASE_SECRET_KEY')
  }
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: links, error } = await db.from('product_links').select('id, url')
  if (error) throw error

  // Lojas diferentes em paralelo; dentro da mesma loja, uma requisição por vez.
  const byHost = new Map<string, LinkRow[]>()
  for (const link of links as LinkRow[]) {
    const host = safeHost(link.url)
    byHost.set(host, [...(byHost.get(host) ?? []), link])
  }

  let ok = 0
  let failed = 0
  await Promise.all(
    [...byHost.values()].map(async (group) => {
      for (const [i, link] of group.entries()) {
        if (i > 0) await sleep(DELAY_PER_HOST_MS)
        const checkedAt = new Date().toISOString()
        try {
          const r = await extractPrice(link.url, { fetchHtml, fetchJson })
          if (!values['dry-run']) {
            await must(db.from('price_snapshots').insert({
              link_id: link.id,
              price: r.price,
              in_stock: r.inStock,
              captured_at: checkedAt,
            }))
            await must(db.from('product_links').update({
              last_price: r.price,
              last_in_stock: r.inStock,
              last_checked_at: checkedAt,
              last_status: 'ok',
              last_error: null,
            }).eq('id', link.id))
          }
          ok++
          console.log(`✔ R$ ${r.price.toFixed(2)} (${r.source}) ${link.url}`)
        } catch (err) {
          failed++
          const message = (err as Error).message.slice(0, 500)
          console.log(`✘ ${message} ${link.url}`)
          if (!values['dry-run']) {
            await must(db.from('product_links').update({
              last_checked_at: checkedAt,
              last_status: 'error',
              last_error: message,
            }).eq('id', link.id))
          }
        }
      }
    }),
  )

  console.log(`\n${ok} ok, ${failed} com erro, ${links.length} links no total.`)
}

async function must(query: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await query
  if (error) throw new Error(`Supabase: ${JSON.stringify(error)}`)
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

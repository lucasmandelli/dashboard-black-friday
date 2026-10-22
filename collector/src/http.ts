const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
}

const TIMEOUT_MS = 20_000

async function get(url: string, accept: string): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { ...HEADERS, Accept: accept },
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (res.ok) return res
      lastError = new Error(`HTTP ${res.status}`)
      // 4xx (exceto 429) não melhora tentando de novo.
      if (res.status < 500 && res.status !== 429) break
    } catch (err) {
      lastError = err
    }
    await sleep(3_000)
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export async function fetchHtml(url: string): Promise<string> {
  const res = await get(url, 'text/html,application/xhtml+xml')
  return res.text()
}

export async function fetchJson(url: string): Promise<unknown> {
  const res = await get(url, 'application/json')
  return res.json()
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

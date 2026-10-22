export interface Link {
  id: string
  product_id: string
  url: string
  store: string
  last_price: number | null
  last_in_stock: boolean | null
  last_checked_at: string | null
  last_status: 'ok' | 'error' | null
  last_error: string | null
}

export interface Product {
  id: string
  name: string
  target_price: number | null
  notes: string | null
  created_at: string
  links: Link[]
}

export interface Snapshot {
  link_id: string
  price: number
  in_stock: boolean
  captured_at: string
}

export interface ProductInput {
  name: string
  target_price: number | null
  notes: string | null
  urls: string[]
}

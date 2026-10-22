export interface Extraction {
  price: number
  inStock: boolean
  /** Qual extrator encontrou o preço (útil para depurar). */
  source: string
}

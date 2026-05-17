export type MenuItem = {
  id: string
  name_en: string
  name_ar: string
  price: number
  image_url: string | null
  available: boolean
  created_at: string
}

export type OrderItem = {
  id: string
  name_en: string
  name_ar: string
  price: number
  qty: number
}

export type Order = {
  id: string
  order_number: number
  items: OrderItem[]
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  total: number
  created_at: string
}

export type OrderStatus = "pending" | "in_progress" | "ready" | "completed"
export type PaymentMethod = "cash" | "transfer"
export type TabId = "daily" | "revenue" | "supply" | "utility" | "profit" | "customers"

export interface Order {
  id: string
  date: string
  customer_name: string
  phone: string
  services: string[]
  weight: number
  amount: number
  note: string
  status: OrderStatus
  payment_method: PaymentMethod
  created_at: string
}

export interface NewOrder {
  date: string
  customer_name: string
  phone: string
  services: string[]
  weight: number
  amount: number
  note: string
  status: OrderStatus
  payment_method: PaymentMethod
}

export interface UtilityBill {
  id: string
  month: number
  year: number
  type: "electric" | "water"
  amount: number
  created_at: string
}

export interface UtilityBillInput {
  month: number
  year: number
  type: "electric" | "water"
  amount: number
}

export interface Supply {
  id: string
  date: string
  type: string
  quantity: number
  unit_price: number
  total_price: number
  action: "import" | "export"
  created_at: string
}

export interface NewSupply {
  date: string
  type: string
  quantity: number
  unit_price: number
  total_price: number
  action: "import" | "export"
}

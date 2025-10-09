export type OrderStatus =
   | "pending"
   | "processing"
   | "shipped"
   | "assigned"
   | "delivered"
   | "cancelled"
   | "refunded";

export interface OrderBase {
   user_id?: string;
   status: OrderStatus;
   subtotal: number;
   tax?: number;
   /** Payment method identifier, e.g. 'cash_on_delivery' */
   payment_method?: string;
   total: number;
   currency?: string;
   customer_email: string;
   customer_first_name: string;
   customer_last_name: string;
   customer_phone?: string;
   delivery_address: string;
   delivery_city: string;
   delivery_notes?: string;
   source?: string;
   is_external?: boolean;
   is_paid?: boolean;
}

export interface Order extends OrderBase {
   id: string;
   order_number: string;
   created_at: string;
   updated_at: string;
   shipped_at?: string | null;
   delivered_at?: string | null;
   items?: OrderItem[];
   status: OrderStatus;
   // Order-level refund fields (for full-order refunds)
   refund_requested?: boolean;
   refund_reason?: string | null;
   refund_status?: RefundStatus | null;
   refund_requested_at?: string | null;
}

export interface OrderItem {
   id: string;
   order_id: string;
   product_id?: string | null;
   product_variation_id?: string | null;
   product_name: string;
   product_sku?: string | null;
   variation_name?: string | null;
   price: number;
   quantity: number;
   total: number;
   created_at: string;
   // Refund-related fields
   refund_requested?: boolean;
   refund_reason?: string | null;
   // refund_status: null | 'requested' | 'approved' | 'rejected' | 'cancelled'
   refund_status?: RefundStatus | null;
   refund_requested_at?: string | null;
}

export interface OrderItemInput {
   product_name: string;
   quantity: number;
   price: number;
   product_id: string;
   variation_name?: string;
   product_sku?: string;
   product_variation_id?: string;
   total: number;
}

export type RefundStatus =
   | "requested"
   | "approved"
   | "rejected"
   | "cancelled"
   | "refunded";

export interface CreateOrderRequest {
   order: OrderBase;
   items: OrderItemInput[];
}

export interface OrderFilters {
   status?: OrderStatus;
   search?: string;
   dateFrom?: string;
   dateTo?: string;
   priceMin?: number;
   priceMax?: number;
   city?: string;
   isPaid?: boolean;
   isExternal?: boolean;
}

export interface OrderQueryOptions {
   filters?: OrderFilters;
   pagination?: {
      page: number;
      limit: number;
   };
   sort?: {
      column: string;
      direction: "asc" | "desc";
   };
}

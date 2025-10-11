import { Order, OrderItem } from "@/types/orders";

export interface NotificationMeta {
  order?: Order;
  order_id?: string;
  order_number?: string;
  status?: string;
  rider_name?: string;
  rider_phone?: string;
  rider?: {
    name?: string;
    phone?: string;
  };
  delivery_address?: string;
  details?: string;
  items?: OrderItem[];
  user_id?: string;
  recipient_user_id?: string;
  rider_id?: string;
  [key: string]: any;
}

/**
 * Format currency amount for display
 */
export const formatCurrency = (amount: number, currency = "NGN"): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format order items for notification display
 */
export const formatOrderItems = (items: OrderItem[] | undefined): string => {
  if (!items || items.length === 0) return "";
  
  const itemsList = items.map(item => {
    const itemName = item.variation_name 
      ? `${item.product_name} (${item.variation_name})`
      : item.product_name;
    const unitPrice = formatCurrency(item.price);
    return `${item.quantity}x ${itemName} ${unitPrice}`;
  }).join(", ");
  
  return itemsList;
};

/**
 * Get order total from items or order
 */
export const getOrderTotal = (order?: Order, items?: OrderItem[]): number => {
  if (order?.total) return order.total;
  if (items && items.length > 0) {
    return items.reduce((sum, item) => sum + item.total, 0);
  }
  return 0;
};

/**
 * Format rider information for display
 */
export const formatRiderInfo = (meta: NotificationMeta): string => {
  const riderName = meta.rider_name || meta.rider?.name || "Rider";
  const riderPhone = meta.rider_phone || meta.rider?.phone || null;
  
  if (riderPhone) {
    return `${riderName}, ${riderPhone}`;
  }
  return `${riderName}, No phone provided`;
};

/**
 * Get user-friendly order number (avoid UUIDs)
 */
export const getOrderNumber = (meta: NotificationMeta): string => {
  // Prefer order_number over order_id if it looks more user-friendly
  const orderNumber = meta.order_number || meta.order?.order_number;
  const orderId = meta.order_id || meta.order?.id;
  
  if (orderNumber && !orderNumber.includes("-") && orderNumber.length <= 10) {
    return `#${orderNumber}`;
  }
  
  if (orderId) {
    // If it's a UUID, try to make it shorter and more readable
    if (orderId.includes("-") && orderId.length > 20) {
      return `#${orderId.slice(0, 8).toUpperCase()}`;
    }
    return `#${orderId}`;
  }
  
  return "your order";
};

/**
 * Format delivery address for display
 */
export const formatDeliveryAddress = (meta: NotificationMeta): string => {
  const address = meta.delivery_address || meta.order?.delivery_address;
  if (!address) return "";
  
  // Truncate long addresses for notifications
  if (address.length > 50) {
    return address.substring(0, 47) + "...";
  }
  
  return address;
};

/**
 * Get status display text
 */
export const getStatusDisplayText = (status?: string): string => {
  if (!status) return "updated";
  
  const statusMap: Record<string, string> = {
    pending: "pending confirmation",
    processing: "being prepared",
    assigned: "assigned to a rider",
    shipped: "on the way",
    delivered: "delivered successfully",
    cancelled: "cancelled",
    refunded: "refunded"
  };
  
  return statusMap[status.toLowerCase()] || status;
};

/**
 * Create detailed order summary for notifications
 */
export const createOrderSummary = (meta: NotificationMeta): string => {
  const orderNumber = getOrderNumber(meta);
  const items = meta.items || meta.order?.items || [];
  const total = getOrderTotal(meta.order, items);
  
  let summary = `Order ${orderNumber}`;
  
  if (items.length > 0) {
    summary += `\n\nItems:\n${formatOrderItems(items)}`;
    
    if (total > 0) {
      summary += `\n\nTotal: ${formatCurrency(total)}`;
    }
  }
  
  const address = formatDeliveryAddress(meta);
  if (address) {
    summary += `\n\nDelivery to: ${address}`;
  }
  
  return summary;
};
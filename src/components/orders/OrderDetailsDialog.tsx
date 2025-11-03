"use client";

import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Order, OrderItem, Rider } from "@/types/orders";
import { Button } from "@/components/ui/button";
import {
   Loader2,
   Copy,
   Check,
   Package,
   User,
   BadgeCheck,
   ShoppingCart,
   ReceiptText,
} from "lucide-react";
import { useState } from "react";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { UserAvatarProfile } from "../user-avatar-profile";
// import { useEffect, useMemo } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface OrderDetailsDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   order: Order;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
   const [copied, setCopied] = useState(false);

   const handleCopy = async () => {
      try {
         await navigator.clipboard.writeText(text);
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
      } catch (err) {
         console.error("Failed to copy:", err);
      }
   };

   return (
      <Button
         variant="ghost"
         size="sm"
         onClick={handleCopy}
         className="h-7 px-2"
         title={label || "Copy to clipboard"}
      >
         {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
         ) : (
            <Copy className="h-3.5 w-3.5" />
         )}
      </Button>
   );
}

export function OrderDetailsDialog({
   open,
   onOpenChange,
   order,
}: OrderDetailsDialogProps) {
   const { useCancelRefundRequestItem, useRequestRefundItem } = useOrders();
   const cancelRefund = useCancelRefundRequestItem();
   const requestRefund = useRequestRefundItem();
   const { useRequestRefundOrder, useCancelRefundRequestOrder } = useOrders();
   const requestOrderRefund = useRequestRefundOrder();
   const cancelOrderRefund = useCancelRefundRequestOrder();
   const { user, hasRole } = useAuth();
   const isOwner = user?.id === order.user_id;
   const isAdmin = typeof hasRole === "function" ? hasRole("admin") : false;
   const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
   const customerName =
      `${order.customer_first_name} ${order.customer_last_name}`.trim();
   const [showOrderRefundDialog, setShowOrderRefundDialog] = useState(false);
   const [orderRefundReason, setOrderRefundReason] = useState("");
   const [orderLoading, setOrderLoading] = useState(false);
   // Rider info from order (now typed)
   const rider: Rider | null | undefined = order.rider;

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent className="max-w-3xl px-1 sm:px-4">
            <DialogHeader>
               <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh] bg-gray-50 rounded-lg px-1 sm:px-0">
               <div className="space-y-6 p-2 sm:p-4">
                  {/* Order Header */}
                  <Card className="p-4 mb-2 border-0 bg-gradient-to-br from-white to-gray-50 shadow-none">
                     <div className="flex justify-between items-start gap-4">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <ReceiptText className="h-5 w-5 text-blue-500" />
                              <h3 className="text-lg font-semibold">
                                 Order #{order.order_number}
                              </h3>
                           </div>
                           <p className="text-sm text-muted-foreground mb-1">
                              {format(
                                 new Date(order.created_at),
                                 "MMMM d, yyyy 'at' HH:mm"
                              )}
                           </p>
                           {/* Rider Info (Admin only) */}
                           {isAdmin && rider && (
                              <div className="mt-2 flex items-center gap-2 bg-blue-50 rounded px-2 py-1">
                                 <BadgeCheck className="h-4 w-4 text-blue-400" />
                                 <span className="text-xs text-muted-foreground">
                                    Rider:
                                 </span>
                                 <UserAvatarProfile
                                    user={{
                                       fullName:
                                          rider.full_name ||
                                          rider.email ||
                                          "Unknown Rider",
                                       subTitle:
                                          rider.phone || rider.email || "",
                                       imageUrl: rider.imageUrl || undefined,
                                    }}
                                    showInfo={false}
                                 />
                                 <span className="text-xs font-medium">
                                    {rider.full_name ||
                                       rider.email ||
                                       "Unknown Rider"}
                                 </span>
                                 {rider.phone && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                       {rider.phone}
                                    </span>
                                 )}
                              </div>
                           )}
                        </div>
                        <Badge
                           className={cn(
                              "capitalize font-semibold text-base px-3 py-1 rounded-lg",
                              {
                                 "bg-green-500/10 text-green-500":
                                    order.status === "delivered",
                                 "bg-yellow-500/10 text-yellow-500": [
                                    "pending",
                                    "processing",
                                    "shipped",
                                 ].includes(order.status),
                                 "bg-red-500/10 text-red-500":
                                    order.status === "cancelled",
                              }
                           )}
                        >
                           {order.status}
                        </Badge>
                     </div>
                  </Card>

                  {/* Customer Information */}
                  <Card className="p-4">
                     <div className="flex items-center gap-2 mb-2">
                        <User className="h-5 w-5 text-blue-500" />
                        <h4 className="font-semibold text-base">
                           Customer Information
                        </h4>
                     </div>
                     <div className="flex items-center space-x-4 mb-4">
                        <UserAvatarProfile
                           user={{
                              fullName: customerName,
                              subTitle: order.customer_email,
                           }}
                           showInfo={false}
                        />
                        <div className="flex-1">
                           <h5 className="font-medium">{customerName}</h5>
                           <div className="flex items-center gap-2">
                              <p className="text-sm text-muted-foreground">
                                 {order.customer_email}
                              </p>
                              <CopyButton
                                 text={order.customer_email}
                                 label="Copy email"
                              />
                           </div>
                           {order.customer_phone && (
                              <div className="flex items-center gap-2">
                                 <p className="text-sm text-muted-foreground">
                                    {order.customer_phone}
                                 </p>
                                 <CopyButton
                                    text={order.customer_phone}
                                    label="Copy phone number"
                                 />
                              </div>
                           )}
                        </div>
                     </div>
                     <div className="space-y-2 border-t pt-2">
                        <h4 className="font-medium">Delivery Address</h4>
                        <p className="text-sm text-muted-foreground">
                           {order.delivery_address}
                        </p>
                        <p className="text-sm text-muted-foreground">
                           {order.delivery_city}
                        </p>
                        {order.delivery_notes && (
                           <p className="text-sm text-muted-foreground italic">
                              Note: {order.delivery_notes}
                           </p>
                        )}
                     </div>
                  </Card>

                  {/* Order Items */}
                  <Card className="p-4">
                     <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="h-5 w-5 text-orange-500" />
                        <h4 className="font-semibold text-base">Order Items</h4>
                     </div>
                     <div className="space-y-4">
                        {order.items?.map((item, index) => (
                           <div
                              key={item.id}
                              className={cn(
                                 "flex gap-4 rounded-lg hover:bg-gray-100 transition-colors p-2",
                                 index !== 0 && "border-t pt-4"
                              )}
                           >
                              {/* Product Image */}
                              {item.product_image_url && (
                                 <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                                    <Image
                                       src={item.product_image_url}
                                       alt={item.product_name}
                                       fill
                                       className="object-cover"
                                       sizes="64px"
                                       onError={(e) => {
                                          e.currentTarget.style.display =
                                             "none";
                                       }}
                                    />
                                 </div>
                              )}
                              <div className="flex-1">
                                 <div className="flex items-center gap-2">
                                    <p className="font-medium">
                                       {item.product_name}
                                    </p>
                                    {item.refund_status ? (
                                       <>
                                          <Badge
                                             variant={
                                                item.refund_status ===
                                                "approved"
                                                   ? "default"
                                                   : item.refund_status ===
                                                     "rejected"
                                                   ? "destructive"
                                                   : "secondary"
                                             }
                                          >
                                             {item.refund_status
                                                .charAt(0)
                                                .toUpperCase() +
                                                item.refund_status.slice(1)}
                                          </Badge>
                                          {item.refund_status ===
                                             "requested" && (
                                             <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={async () => {
                                                   setLoadingItemId(item.id);
                                                   try {
                                                      await cancelRefund.mutateAsync(
                                                         item.id
                                                      );
                                                   } catch (e) {
                                                      // handled by mutation
                                                   } finally {
                                                      setLoadingItemId(null);
                                                   }
                                                }}
                                                disabled={
                                                   loadingItemId === item.id
                                                }
                                             >
                                                {loadingItemId === item.id ? (
                                                   <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                   "Cancel"
                                                )}
                                             </Button>
                                          )}
                                       </>
                                    ) : null}
                                 </div>
                                 {item.variation_name && (
                                    <p className="text-sm text-muted-foreground">
                                       Variation: {item.variation_name}
                                    </p>
                                 )}
                                 <div className="flex justify-between items-center mt-2">
                                    <p className="text-sm text-muted-foreground">
                                       Quantity: {item.quantity} ×{" "}
                                       {Number(
                                          item.price || 0
                                       ).toLocaleString()}{" "}
                                       RWF
                                    </p>
                                    <p className="font-medium">
                                       {Number(
                                          item.total || 0
                                       ).toLocaleString()}{" "}
                                       RWF
                                    </p>
                                 </div>
                                 {item.refund_reason && (
                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                       Reason: {item.refund_reason}
                                    </p>
                                 )}
                              </div>
                           </div>
                        ))}
                     </div>
                  </Card>

                  {/* Order Summary */}
                  <Card className="p-4">
                     <div className="flex items-center gap-2 mb-2">
                        <Package className="h-5 w-5 text-green-500" />
                        <h4 className="font-semibold text-base">
                           Order Summary
                        </h4>
                     </div>
                     <div className="space-y-2">
                        <div className="flex justify-between">
                           <p className="text-muted-foreground">Subtotal</p>
                           <p>
                              {Number(order.subtotal || 0).toLocaleString()} RWF
                           </p>
                        </div>
                        {order.tax && (
                           <div className="flex justify-between">
                              <p className="text-muted-foreground">Tax</p>
                              <p>
                                 {Number(order.tax || 0).toLocaleString()} RWF
                              </p>
                           </div>
                        )}
                        <div className="flex justify-between font-semibold border-t pt-2">
                           <p>Total</p>
                           <p>
                              {Number(order.total || 0).toLocaleString()} RWF
                           </p>
                        </div>
                     </div>
                  </Card>
               </div>
            </ScrollArea>
         </DialogContent>
      </Dialog>
   );
}

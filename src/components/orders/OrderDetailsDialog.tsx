"use client";

import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Order, OrderItem } from "@/types/orders";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { UserAvatarProfile } from "../user-avatar-profile";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

interface OrderDetailsDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   order: Order;
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

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent className="max-w-3xl">
            <DialogHeader>
               <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh]">
               <div className="space-y-6 p-2">
                  {/* Order Header */}
                  <div className="flex justify-between items-start">
                     <div>
                        <h3 className="text-lg font-semibold">
                           Order #{order.order_number}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                           {format(
                              new Date(order.created_at),
                              "MMMM d, yyyy 'at' HH:mm"
                           )}
                        </p>
                     </div>
                     <Badge
                        className={cn("capitalize font-semibold", {
                           "bg-green-500/10 text-green-500":
                              order.status === "delivered",
                           "bg-yellow-500/10 text-yellow-500":
                              order.status === "pending" ||
                              order.status === "processing" ||
                              order.status === "shipped",
                           "bg-red-500/10 text-red-500":
                              order.status === "cancelled",
                        })}
                     >
                        {order.status}
                     </Badge>
                  </div>

                  {/* Customer Information */}
                  <Card className="p-4">
                     <h4 className="font-semibold mb-4">
                        Customer Information
                     </h4>
                     <div className="flex items-center space-x-4 mb-4">
                        <UserAvatarProfile
                           user={{
                              fullName: customerName,
                              subTitle: order.customer_email,
                           }}
                           showInfo={false}
                        />
                        <div>
                           <h5 className="font-medium">{customerName}</h5>
                           <p className="text-sm text-muted-foreground">
                              {order.customer_email}
                           </p>
                           {order.customer_phone && (
                              <p className="text-sm text-muted-foreground">
                                 {order.customer_phone}
                              </p>
                           )}
                        </div>
                     </div>
                     <div className="space-y-2">
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
                     <h4 className="font-semibold mb-4">Order Items</h4>
                     <div className="space-y-4">
                        {order.items?.map((item, index) => (
                           <div
                              key={item.id}
                              className={cn(
                                 "flex justify-between items-start",
                                 index !== 0 && "border-t pt-4"
                              )}
                           >
                              <div>
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
                                 <p className="text-sm text-muted-foreground">
                                    Quantity: {item.quantity}
                                 </p>
                                 {item.refund_reason && (
                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                       Reason: {item.refund_reason}
                                    </p>
                                 )}
                              </div>
                              <p className="font-medium">
                                 {item.total.toLocaleString()} RWF
                              </p>
                           </div>
                        ))}
                     </div>
                  </Card>

                  {/* Order Summary */}
                  <Card className="p-4">
                     <h4 className="font-semibold mb-4">Order Summary</h4>
                     <div className="space-y-2">
                        <div className="flex justify-between">
                           <p className="text-muted-foreground">Subtotal</p>
                           <p>{order.subtotal.toLocaleString()} RWF</p>
                        </div>
                        {order.tax && (
                           <div className="flex justify-between">
                              <p className="text-muted-foreground">Tax</p>
                              <p>{order.tax.toLocaleString()} RWF</p>
                           </div>
                        )}
                        <div className="flex justify-between font-semibold border-t pt-2">
                           <p>Total</p>
                           <p>{order.total.toLocaleString()} RWF</p>
                        </div>
                        {/* Full order refund actions - only visible to the order owner and hidden for admins */}
                        {isOwner && !isAdmin && (
                           <div className="mt-4 space-x-2">
                              {!order.refund_status && (
                                 <Button
                                    variant="outline"
                                    onClick={() =>
                                       setShowOrderRefundDialog(true)
                                    }
                                 >
                                    {order.status === "delivered"
                                       ? "Request full order refund"
                                       : "Request full order reject"}
                                 </Button>
                              )}
                              {order.refund_status === "requested" && (
                                 <Button
                                    variant="ghost"
                                    onClick={async () => {
                                       try {
                                          setOrderLoading(true);
                                          await cancelOrderRefund.mutateAsync(
                                             order.id
                                          );
                                       } catch (e) {
                                          // handled by mutation
                                       } finally {
                                          setOrderLoading(false);
                                       }
                                    }}
                                 >
                                    {orderLoading ? (
                                       <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                       "Cancel full refund request"
                                    )}
                                 </Button>
                              )}
                           </div>
                        )}
                     </div>
                  </Card>
                  {/* Request full refund dialog */}
                  <Dialog
                     open={showOrderRefundDialog}
                     onOpenChange={setShowOrderRefundDialog}
                  >
                     <DialogContent className="max-w-md">
                        <DialogHeader>
                           <DialogTitle>
                              {order.status === "delivered"
                                 ? "Request full order refund"
                                 : "Request full order reject"}
                           </DialogTitle>
                        </DialogHeader>
                        <div className="p-4">
                           <p className="text-sm text-muted-foreground mb-2">
                              Please provide a reason for requesting a refund
                              for the entire order.
                           </p>
                           <Input
                              value={orderRefundReason}
                              onChange={(e) =>
                                 setOrderRefundReason(e.target.value)
                              }
                              placeholder="Reason"
                           />
                           <div className="mt-4 flex justify-end">
                              <Button
                                 variant="ghost"
                                 onClick={() => setShowOrderRefundDialog(false)}
                              >
                                 Cancel
                              </Button>
                              <Button
                                 className="ml-2"
                                 onClick={async () => {
                                    if (!orderRefundReason.trim()) return;
                                    try {
                                       setOrderLoading(true);
                                       await requestOrderRefund.mutateAsync({
                                          orderId: order.id,
                                          reason: orderRefundReason,
                                       });
                                       setShowOrderRefundDialog(false);
                                       setOrderRefundReason("");
                                    } catch (e) {
                                       // handled by mutation
                                    } finally {
                                       setOrderLoading(false);
                                    }
                                 }}
                              >
                                 {orderLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                 ) : order.status === "delivered" ? (
                                    "Request refund"
                                 ) : (
                                    "Request reject"
                                 )}
                              </Button>
                           </div>
                        </div>
                     </DialogContent>
                  </Dialog>
               </div>
            </ScrollArea>
         </DialogContent>
      </Dialog>
   );
}

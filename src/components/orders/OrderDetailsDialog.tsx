"use client";

import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Order, OrderItem } from "@/types/orders";
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
   const customerName =
      `${order.customer_first_name} ${order.customer_last_name}`.trim();

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
                                 <p className="font-medium">
                                    {item.product_name}
                                 </p>
                                 {item.variation_name && (
                                    <p className="text-sm text-muted-foreground">
                                       Variation: {item.variation_name}
                                    </p>
                                 )}
                                 <p className="text-sm text-muted-foreground">
                                    Quantity: {item.quantity}
                                 </p>
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
                     </div>
                  </Card>
               </div>
            </ScrollArea>
         </DialogContent>
      </Dialog>
   );
}

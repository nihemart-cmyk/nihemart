"use client";

import React, { useState } from "react";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Order, OrderItem } from "@/types/orders";
import { useOrders } from "@/hooks/useOrders";
import { toast } from "sonner";

interface Props {
   open: boolean;
   onOpenChange: (v: boolean) => void;
   order: Order;
   item?: OrderItem | null;
}

export function ManageRefundDialog({ open, onOpenChange, order, item }: Props) {
   const { useRespondRefundRequest, useRespondOrderRefund } = useOrders();
   const respond = useRespondRefundRequest();
   const respondOrder = useRespondOrderRefund();
   const [processing, setProcessing] = useState(false);
   const [note, setNote] = useState("");

   const mode = item
      ? order?.delivered_at
         ? "refund"
         : "reject"
      : order?.delivered_at
      ? "refund"
      : "reject";

   const handleResponse = async (approve: boolean) => {
      if (processing) return;
      setProcessing(true);
      try {
         if (item) {
            await respond.mutateAsync({ itemId: item.id, approve, note });
         } else {
            // order-level refund
            await respondOrder.mutateAsync({
               orderId: order.id,
               approve,
               note,
            });
         }
         // Show correct toast depending on mode
         if (mode === "refund") {
            toast.success(approve ? "Refund approved" : "Refund rejected");
         } else {
            toast.success(approve ? "Reject approved" : "Reject rejected");
         }
         onOpenChange(false);
      } catch (err: any) {
         toast.error(err?.message || `Failed to process ${mode}`);
      } finally {
         setProcessing(false);
      }
   };

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent className="max-w-lg">
            <DialogHeader>
               <DialogTitle>
                  {mode === "refund" ? "Manage Refund" : "Manage Reject"}
               </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
               <div>
                  <p className="font-semibold">Customer</p>
                  <p className="text-sm">
                     {order.customer_first_name} {order.customer_last_name} —{" "}
                     {order.delivery_city}
                  </p>
               </div>

               {item ? (
                  <>
                     <div>
                        <p className="font-semibold">Item</p>
                        <p className="text-sm">
                           {item.product_name}{" "}
                           {item.variation_name
                              ? `(${item.variation_name})`
                              : ""}
                        </p>
                        <p className="text-sm">
                           Qty: {item.quantity} • Total:{" "}
                           {item.total?.toLocaleString?.() || item.total} RWF
                        </p>
                     </div>

                     <div>
                        <p className="font-semibold">Reason</p>
                        <p className="text-sm italic">{item.refund_reason}</p>
                     </div>
                  </>
               ) : (
                  <div>
                     <p className="font-semibold">Order refund</p>
                     <p className="text-sm italic">{order.refund_reason}</p>
                  </div>
               )}

               <div>
                  <p className="font-semibold">Admin note (optional)</p>
                  <Textarea
                     value={note}
                     onChange={(e) => setNote(e.target.value)}
                     placeholder="Add note to the user or internal logs"
                  />
               </div>
            </div>

            <DialogFooter>
               <div className="flex gap-2 justify-end mt-4">
                  <Button
                     variant="ghost"
                     onClick={() => onOpenChange(false)}
                     disabled={processing}
                  >
                     Cancel
                  </Button>
                  <Button
                     variant="destructive"
                     onClick={() => handleResponse(false)}
                     disabled={processing}
                  >
                     Reject
                  </Button>
                  <Button
                     className="bg-green-600 hover:bg-green-700"
                     onClick={() => handleResponse(true)}
                     disabled={processing}
                  >
                     Approve
                  </Button>
               </div>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}

"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useState, useEffect } from "react";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { useRiders, useAssignOrder } from "@/hooks/useRiders";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";

interface AssignRiderDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   orderId: string;
}

export function AssignRiderDialog({
   open,
   onOpenChange,
   orderId,
}: AssignRiderDialogProps) {
   const [note, setNote] = useState("");
   const [selectedRider, setSelectedRider] = useState<string | undefined>(
      undefined
   );

   const ridersQuery = useRiders();
   const assignMutation = useAssignOrder();
   const orders = useOrders();

   useEffect(() => {
      if (!open) {
         setNote("");
         setSelectedRider(undefined);
      }
   }, [open]);

   const handleAssign = async () => {
      if (!selectedRider) {
         toast.error("Please select a rider to assign");
         return;
      }

      try {
         await assignMutation.mutateAsync({
            orderId,
            riderId: selectedRider,
            notes: note,
         });
         toast.success("Order assigned to rider");
         // refresh orders and riders
         orders.invalidateOrders();
         // close dialog
         onOpenChange(false);
      } catch (err: any) {
         console.error("Failed to assign order:", err);
         const msg =
            (err && err.error && (err.error.message || err.error)) ||
            err?.message ||
            (typeof err === "string" ? err : null) ||
            "Failed to assign order";
         toast.error(String(msg));
      }
   };

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Assign to rider</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
               <div>
                  <Label>Order</Label>
                  <div className="mt-1 text-sm text-muted-foreground">
                     {orderId}
                  </div>
               </div>

               <div>
                  <Label>Rider</Label>
                  <div className="mt-2">
                     <Select
                        value={selectedRider}
                        onValueChange={(v) => setSelectedRider(v || undefined)}
                     >
                        <SelectTrigger>
                           <SelectValue
                              placeholder={
                                 ridersQuery.isLoading
                                    ? "Loading riders..."
                                    : "Select a rider..."
                              }
                           />
                        </SelectTrigger>
                        <SelectContent>
                           {ridersQuery.data && ridersQuery.data.length > 0 ? (
                              // show only active riders
                              ridersQuery.data
                                 .filter((r) => r.active !== false)
                                 .map((r) => (
                                    <SelectItem
                                       key={r.id}
                                       value={r.id}
                                    >
                                       {r.full_name || r.id}
                                       {r.phone ? ` — ${r.phone}` : ""}
                                    </SelectItem>
                                 ))
                           ) : (
                              <SelectItem value="">
                                 No riders available
                              </SelectItem>
                           )}
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <div>
                  <Label>Note</Label>
                  <Input
                     value={note}
                     onChange={(e) => setNote(e.target.value)}
                     placeholder="Add a note (optional)"
                  />
               </div>

               <div className="flex justify-end gap-2">
                  <Button
                     variant="ghost"
                     onClick={() => onOpenChange(false)}
                  >
                     Cancel
                  </Button>
                  <Button
                     onClick={handleAssign}
                     disabled={
                        assignMutation.status === "pending" ||
                        ridersQuery.isLoading ||
                        !selectedRider
                     }
                  >
                     {assignMutation.status === "pending" ? (
                        <>
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           Assigning...
                        </>
                     ) : (
                        "Assign"
                     )}
                  </Button>
               </div>
            </div>
         </DialogContent>
      </Dialog>
   );
}

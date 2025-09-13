"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useState } from "react";

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

   const handleAssign = () => {
      // Placeholder: riders management not implemented yet
      // For now just close the dialog and console log
      console.log(
         `Assigning order ${orderId} to rider (placeholder). Note:`,
         note
      );
      onOpenChange(false);
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
                  <div className="mt-1 text-sm text-muted-foreground">
                     Assign to rider here (not implemented)
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
                  <Button onClick={handleAssign}>Assign</Button>
               </div>
            </div>
         </DialogContent>
      </Dialog>
   );
}

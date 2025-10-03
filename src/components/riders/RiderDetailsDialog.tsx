"use client";
import React from "react";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatarProfile } from "@/components/user-avatar-profile";

type Props = {
   open: boolean;
   riderId: string;
   onOpenChange: (open: boolean) => void;
};

export default function RiderDetailsDialog({
   open,
   riderId,
   onOpenChange,
}: Props) {
   const [loading, setLoading] = React.useState(false);
   const [error, setError] = React.useState<string | null>(null);
   const [rider, setRider] = React.useState<any>(null);
   const [assignments, setAssignments] = React.useState<any[]>([]);

   React.useEffect(() => {
      if (!open || !riderId) return;
      setLoading(true);
      setError(null);
      (async () => {
         try {
            const res = await fetch(
               `/api/admin/rider-details?rid=${encodeURIComponent(riderId)}`
            );
            const j = await res.json();
            if (!res.ok) throw new Error(j.error || "Failed to load");
            setRider(j.rider);
            setAssignments(j.assignments || []);
         } catch (e: any) {
            setError(e?.message || String(e));
         } finally {
            setLoading(false);
         }
      })();
   }, [open, riderId]);

   return (
      <Dialog
         open={open}
         onOpenChange={onOpenChange}
      >
         <DialogContent className="max-w-3xl">
            <DialogHeader>
               <DialogTitle>Rider Details</DialogTitle>
            </DialogHeader>
            {loading ? (
               <div className="p-4">Loading...</div>
            ) : error ? (
               <div className="p-4 text-red-600">{error}</div>
            ) : rider ? (
               <div className="space-y-6 p-2">
                  <div className="flex items-center justify-between">
                     <UserAvatarProfile
                        user={{
                           fullName: rider.full_name || "Unnamed",
                           subTitle: rider.phone || rider.vehicle || "",
                           imageUrl: rider.image_url || undefined,
                        }}
                        showInfo
                     />
                     <div className="text-sm text-muted-foreground">
                        {rider.location || "—"}
                     </div>
                  </div>

                  <div className="space-y-3">
                     <h4 className="font-semibold">Recent Deliveries</h4>
                     <div className="divide-y rounded border">
                        {assignments.length === 0 && (
                           <div className="p-3 text-sm text-muted-foreground">
                              No deliveries yet.
                           </div>
                        )}
                        {assignments.map((a: any) => {
                           const o = a.orders;
                           return (
                              <div
                                 key={a.id}
                                 className="p-3 flex items-center justify-between"
                              >
                                 <div className="text-sm">
                                    <div className="font-medium">
                                       {o?.order_number || o?.id}
                                    </div>
                                    <div className="text-muted-foreground">
                                       {o?.delivery_address ||
                                          o?.delivery_city ||
                                          "—"}
                                    </div>
                                 </div>
                                 <div className="text-sm">
                                    {(o?.total ?? 0).toLocaleString()} RWF
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               </div>
            ) : null}
         </DialogContent>
      </Dialog>
   );
}

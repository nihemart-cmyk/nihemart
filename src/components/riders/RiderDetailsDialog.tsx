"use client";
import React from "react";
import {
   Select,
   SelectTrigger,
   SelectValue,
   SelectContent,
   SelectItem,
} from "@/components/ui/select";
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
   const [timeframe, setTimeframe] = React.useState<string>("7");

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

   // helper: parse date-ish values
   const parseDate = (v: any) => {
      if (!v) return null;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
   };

   // compute filtered assignments by timeframe
   const filteredAssignments = React.useMemo(() => {
      if (!assignments || assignments.length === 0) return [] as any[];
      const days = Number(timeframe) || 7;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return assignments.filter((a: any) => {
         // prefer assignment timestamps then order timestamps
         const ts =
            parseDate(a.assigned_at) ||
            parseDate(a.updated_at) ||
            parseDate(a.created_at) ||
            parseDate(a.orders?.created_at) ||
            parseDate(a.orders?.updated_at) ||
            null;
         if (!ts) return false;
         return ts >= cutoff;
      });
   }, [assignments, timeframe]);

   const metrics = React.useMemo(() => {
      const m = { assigned: 0, delivered: 0, rejected: 0 };
      for (const a of filteredAssignments) {
         const s = (a.status || "").toString().toLowerCase();
         if (s === "assigned") m.assigned++;
         else if (s === "accepted" || s === "completed" || s === "delivered")
            m.delivered++;
         else if (s === "rejected" || s === "declined" || s === "cancelled")
            m.rejected++;
      }
      return m;
   }, [filteredAssignments]);

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
                     <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Recent Deliveries</h4>
                        <div className="w-48">
                           <Select
                              value={timeframe}
                              onValueChange={setTimeframe}
                           >
                              <SelectTrigger>
                                 <SelectValue placeholder="Last 7 days" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="7">Past 7 days</SelectItem>
                                 <SelectItem value="30">
                                    Past 30 days
                                 </SelectItem>
                                 <SelectItem value="365">
                                    Past 12 months
                                 </SelectItem>
                              </SelectContent>
                           </Select>
                        </div>
                     </div>

                     <div className="grid grid-cols-3 gap-3">
                        {/* Metric cards: assigned, delivered, rejected */}
                        <div className="p-3 rounded border bg-white">
                           <div className="text-xs text-muted-foreground">
                              Currently Assigned
                           </div>
                           <div className="text-lg font-semibold">
                              {metrics.assigned}
                           </div>
                        </div>
                        <div className="p-3 rounded border bg-white">
                           <div className="text-xs text-muted-foreground">
                              Completed Deliveries
                           </div>
                           <div className="text-lg font-semibold">
                              {metrics.delivered}
                           </div>
                        </div>
                        <div className="p-3 rounded border bg-white">
                           <div className="text-xs text-muted-foreground">
                              Declined / Rejected
                           </div>
                           <div className="text-lg font-semibold">
                              {metrics.rejected}
                           </div>
                        </div>
                     </div>

                     <div className="divide-y rounded border">
                        {assignments.length === 0 && (
                           <div className="p-3 text-sm text-muted-foreground">
                              No deliveries yet.
                           </div>
                        )}
                        {filteredAssignments.map((a: any) => {
                           const o = a.orders || a.order || null;
                           // Prefer delivery fee from order.tax or order.delivery_fee or assignment.delivery_fee
                           const fee =
                              o?.tax ??
                              o?.delivery_fee ??
                              a.delivery_fee ??
                              a.fee ??
                              0;
                           const feeNum =
                              typeof fee === "string"
                                 ? parseFloat(fee)
                                 : Number(fee || 0);
                           return (
                              <div
                                 key={a.id}
                                 className="p-3 flex items-center justify-between"
                              >
                                 <div className="text-sm">
                                    <div className="font-medium">
                                       {o?.order_number || o?.id || a.order_id}
                                    </div>
                                    <div className="text-muted-foreground">
                                       {o?.delivery_address ||
                                          o?.delivery_city ||
                                          a.location ||
                                          "—"}
                                    </div>
                                 </div>
                                 <div className="text-sm">
                                    {isNaN(feeNum)
                                       ? "-"
                                       : feeNum.toLocaleString()}{" "}
                                    RWF
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

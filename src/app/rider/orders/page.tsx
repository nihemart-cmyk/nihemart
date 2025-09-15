"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table/data-table";
import {
   useReactTable,
   createColumnHelper,
   getCoreRowModel,
   getPaginationRowModel,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
   DropdownMenu,
   DropdownMenuTrigger,
   DropdownMenuContent,
   DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { fetchRiderByUserId } from "@/integrations/supabase/riders";
import { useRiderAssignments, useRespondToAssignment } from "@/hooks/useRiders";
import { fetchOrderById } from "@/integrations/supabase/orders";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import { MoreHorizontal } from "lucide-react";

const Page = () => {
   const { user, isLoggedIn } = useAuth();
   const [riderId, setRiderId] = useState<string | null>(null);
   const [loadingRider, setLoadingRider] = useState(false);

   const respond = useRespondToAssignment();

   useEffect(() => {
      if (!user) return;
      (async () => {
         setLoadingRider(true);
         try {
            const r = await fetchRiderByUserId(user.id);
            setRiderId(r?.id || null);
         } catch (err) {
            console.error("Failed to fetch rider for user", err);
         } finally {
            setLoadingRider(false);
         }
      })();
   }, [user]);

   const { data: assignments, isLoading } = useRiderAssignments(
      riderId || undefined
   );

   // Cache for order details when assignment does not include joined order data
   const [orderMap, setOrderMap] = useState<Record<string, any>>({});
   const [viewOrder, setViewOrder] = useState<any | null>(null);
   const [search, setSearch] = useState("");

   // Handler to respond to assignments (accepted/rejected/completed)
   const handleRespond = async (
      assignmentId: string,
      status: "accepted" | "rejected" | "completed"
   ) => {
      try {
         await respond.mutateAsync({ assignmentId, status });
      } catch (err: any) {
         console.error(err);
         alert(err?.message || "Failed to respond");
      }
   };

   // Prepare table data and columns in stable hooks to avoid changing hook order
   const data = useMemo(() => {
      return (assignments || []).map((a: any) => {
         let order: any = null;
         if (a.orders) order = a.orders;
         if (!order && a.order) order = a.order;
         if (typeof order === "string") {
            try {
               order = JSON.parse(order);
            } catch (e) {}
         }
         if (Array.isArray(order)) order = order[0] || null;
         if (!order && orderMap[a.order_id]) order = orderMap[a.order_id];

         const location =
            order?.delivery_address ||
            order?.delivery_city ||
            a.location ||
            a.address ||
            "-";
         let amount: number | null = null;
         if (order) {
            if (typeof order.total === "number") amount = order.total;
            else if (order.items && Array.isArray(order.items)) {
               const itemsTotal = order.items.reduce(
                  (s: number, it: any) => s + (Number(it.total) || 0),
                  0
               );
               if (itemsTotal) amount = itemsTotal;
            }
            if (amount == null && typeof order.subtotal === "number") {
               const tax = typeof order.tax === "number" ? order.tax : 0;
               amount = order.subtotal + tax;
            }
         }
         if (amount == null) {
            if (typeof a.amount === "number") amount = a.amount;
            else if (typeof a.total === "number") amount = a.total;
            else if (
               typeof a.amount === "string" &&
               !Number.isNaN(Number(a.amount))
            )
               amount = Number(a.amount);
         }

         return {
            assignment: a,
            order,
            orderNumber: order?.order_number
               ? `#${order.order_number}`
               : `#${a.order_id}`,
            location,
            amount,
            status: a.status,
         };
      });
   }, [assignments, orderMap]);

   const filteredData = useMemo(() => {
      if (!search) return data;
      return data.filter((row: any) => {
         const text =
            `${row.orderNumber} ${row.location} ${row.status}`.toLowerCase();
         return text.includes(search.toLowerCase());
      });
   }, [data, search]);

   const columns = useMemo(() => {
      const columnHelper = createColumnHelper<any>();
      return [
         // selection column
         {
            id: "select",
            header: ({ table }: any) => (
               <Checkbox
                  checked={table.getIsAllPageRowsSelected()}
                  onCheckedChange={(v: any) =>
                     table.toggleAllPageRowsSelected(!!v)
                  }
               />
            ),
            cell: ({ row }: any) => (
               <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(v: any) => row.toggleSelected(!!v)}
               />
            ),
            enableSorting: false,
         },
         columnHelper.accessor("orderNumber", {
            header: "Order",
            cell: (info) => (
               <span className="font-medium">{info.getValue()}</span>
            ),
         }),
         columnHelper.accessor("location", {
            header: "Location",
            cell: (info) => (
               <span className="text-sm text-text-secondary max-w-md truncate block">
                  {info.getValue()}
               </span>
            ),
         }),
         columnHelper.accessor("amount", {
            header: "Amount",
            cell: (info) => {
               const v = info.getValue();
               return (
                  <span className="font-medium">
                     {v != null ? `RWF ${Number(v).toLocaleString()}` : "-"}
                  </span>
               );
            },
         }),
         columnHelper.accessor("status", {
            header: "Status",
            cell: (info) => {
               const row = info.row.original;
               const a = row.assignment;
               if (a.status === "assigned") {
                  return (
                     <div className="flex gap-2 justify-end">
                        <Button
                           onClick={() => handleRespond(a.id, "accepted")}
                           className="bg-green-600 text-white"
                        >
                           Accept
                        </Button>
                        <Button
                           onClick={() => handleRespond(a.id, "rejected")}
                           className="bg-red-500 text-white"
                        >
                           Reject
                        </Button>
                     </div>
                  );
               }
               if (a.status === "accepted")
                  return (
                     <Button
                        onClick={() => handleRespond(a.id, "completed")}
                        className="bg-orange-600 text-white"
                     >
                        Mark Delivered
                     </Button>
                  );
               if (a.status === "rejected")
                  return (
                     <span className="text-sm text-gray-600">Rejected</span>
                  );
               if (a.status === "completed")
                  return (
                     <span className="text-sm text-gray-600">Delivered</span>
                  );
               return <span className="text-sm text-gray-600">{a.status}</span>;
            },
         }),
         columnHelper.display({
            id: "actions",
            header: () => null,
            cell: (info) => {
               const row = info.row.original;
               const a = row.assignment;
               const order = row.order;
               return (
                  <div className="flex items-center justify-end">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                           >
                              <MoreHorizontal className="h-4 w-4" />
                           </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem
                              onClick={async () => {
                                 let o = order || orderMap[a.order_id];
                                 if (!o) {
                                    try {
                                       o = await fetchOrderById(a.order_id);
                                       if (o)
                                          setOrderMap((p) => ({
                                             ...p,
                                             [a.order_id]: o,
                                          }));
                                    } catch (e) {}
                                 }
                                 if (o) setViewOrder(o);
                              }}
                           >
                              View
                           </DropdownMenuItem>
                           <DropdownMenuItem
                              onClick={() => {
                                 if (
                                    typeof navigator !== "undefined" &&
                                    navigator.clipboard
                                 )
                                    navigator.clipboard.writeText(
                                       a.order_id || ""
                                    );
                              }}
                           >
                              Copy ID
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
               );
            },
         }),
      ];
   }, [handleRespond, orderMap]);

   const table = useReactTable({
      data: filteredData,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
   });

   useEffect(() => {
      if (!assignments || assignments.length === 0) return;

      const missingIds = assignments
         .map((a: any) => a.order_id)
         .filter((id: any) => id && !orderMap[id]);

      if (missingIds.length === 0) return;

      let canceled = false;

      (async () => {
         try {
            const results = await Promise.all(
               missingIds.map((id: string) =>
                  fetchOrderById(id).catch(() => null)
               )
            );
            if (canceled) return;
            setOrderMap((prev) => {
               const next = { ...prev };
               missingIds.forEach((id: string, idx: number) => {
                  const res = results[idx];
                  if (res) next[id] = res;
               });
               return next;
            });
         } catch (err) {
            console.error("Failed to fetch assignment orders:", err);
         }
      })();

      return () => {
         canceled = true;
      };
   }, [assignments]);

   if (!isLoggedIn)
      return <div className="p-6">Please sign in to view your orders.</div>;
   if (loadingRider) return <div className="p-6">Loading rider...</div>;
   if (!riderId)
      return (
         <div className="p-6">No rider profile found for your account.</div>
      );

   return (
      <ScrollArea className="h-[calc(100vh-5rem)]">
         <div className="p-6 w-full mx-auto">
            <div className="mb-4">
               <Link
                  href="/rider"
                  className="text-orange-500"
               >
                  ← Back
               </Link>
            </div>
            <Tabs defaultValue="orders">
               <TabsList>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                  <TabsTrigger value="statistics">Statistics</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
               </TabsList>

               <TabsContent value="orders">
                  <div className="p-5 rounded-2xl bg-white">
                     <div className="flex items-center justify-between mb-4">
                        <div>
                           <h3 className="text-lg font-bold">
                              Assigned Orders
                           </h3>
                           <p className="text-sm text-text-secondary">
                              Your current assignments and actions.
                           </p>
                        </div>
                     </div>

                     <div className="w-full">
                        {isLoading ? (
                           <div className="flex justify-center items-center py-12">
                              <span>Loading assignments...</span>
                           </div>
                        ) : (
                           <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                 <Input
                                    placeholder="Search order, location, status..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="max-w-sm"
                                 />
                              </div>
                              <DataTable table={table as any} />
                           </div>
                        )}
                     </div>
                     {viewOrder && (
                        <OrderDetailsDialog
                           open={!!viewOrder}
                           onOpenChange={(open) => {
                              if (!open) setViewOrder(null);
                           }}
                           order={viewOrder}
                        />
                     )}
                  </div>
               </TabsContent>

               <TabsContent value="statistics">Coming soon.</TabsContent>
               <TabsContent value="settings">Coming soon.</TabsContent>
            </Tabs>
         </div>
      </ScrollArea>
   );
};

export default Page;

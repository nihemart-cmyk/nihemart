"use client";

import React from "react";
import Link from "next/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import useRiders, {
   useAssignOrder,
   useRiderAssignments,
} from "@/hooks/useRiders";
import { useEffect } from "react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
   ColumnDef,
   getCoreRowModel,
   useReactTable,
} from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
   DropdownMenuLabel,
   DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserAvatarProfile } from "@/components/user-avatar-profile";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import { PlusCircle, TrendingUp, TrendingDown } from "lucide-react";

const AssignOrderToRiderDialog = dynamic(
   () => import("@/components/riders/AssignOrderToRiderDialog")
);

const RidersPage = () => {
   const { data, isLoading, isError, refetch } = useRiders();
   const assign = useAssignOrder();
   const [dialogOpen, setDialogOpen] = useState(false);
   const [activeRiderId, setActiveRiderId] = useState<string | null>(null);

   const riders = data || [];

   const openAssignDialog = (riderId: string) => {
      setActiveRiderId(riderId);
      setDialogOpen(true);
   };

   const onAssigned = () => {
      toast.success("Order assigned");
      refetch();
   };

   const totalRiders = riders.length;
   const activeRiders = riders.filter((r: any) => r.active).length;
   const vehicles = Array.from(
      new Set(riders.map((r: any) => r.vehicle).filter(Boolean))
   ).length;
   const [topAmount, setTopAmount] = useState<number | null>(null);

   useEffect(() => {
      let mounted = true;
      fetch("/api/admin/riders/top-amount")
         .then((r) => r.json())
         .then((d) => {
            if (!mounted) return;
            setTopAmount(d?.topAmount || 0);
         })
         .catch(() => {
            if (!mounted) return;
            setTopAmount(null);
         });
      return () => {
         mounted = false;
      };
   }, []);

   // Helper components and table columns must be defined in component scope (not inside JSX)
   const LatestAssignment = ({ row }: any) => {
      const riderId = row.original.id;
      const assignmentsQuery = useRiderAssignments(riderId);
      const latest = assignmentsQuery.data?.[0];
      const order = latest?.orders;
      return (
         <div className="text-sm">
            {order ? (
               <div className="font-medium">
                  {order.total?.toLocaleString?.() || order.total} RWF
               </div>
            ) : (
               <div className="text-muted-foreground">—</div>
            )}
         </div>
      );
   };

   const AddressCell = ({ row }: any) => {
      const riderId = row.original.id;
      const assignmentsQuery = useRiderAssignments(riderId);
      const latest = assignmentsQuery.data?.[0];
      const order = latest?.orders;
      return (
         <div className="text-sm text-text-secondary max-w-sm truncate">
            {order?.delivery_address || "—"}
         </div>
      );
   };

   const columns: ColumnDef<any>[] = [
      {
         id: "select",
         header: ({ table }) => (
            <Checkbox
               checked={table.getIsAllPageRowsSelected()}
               onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            />
         ),
         cell: ({ row }) => (
            <Checkbox
               checked={row.getIsSelected()}
               onCheckedChange={(v) => row.toggleSelected(!!v)}
            />
         ),
         enableSorting: false,
      },
      {
         accessorKey: "full_name",
         header: "RIDER",
         cell: ({ row }) => {
            const name = String(row.getValue("full_name") || "Unnamed");
            const phone = String(row.original.phone || "");
            return (
               <UserAvatarProfile
                  user={{ fullName: name, subTitle: phone }}
                  showInfo
               />
            );
         },
      },
      {
         accessorKey: "vehicle",
         header: "VEHICLE",
      },
      {
         accessorKey: "active",
         header: "ACTIVE",
         cell: ({ row }) => (
            <Badge>{row.getValue("active") ? "Yes" : "No"}</Badge>
         ),
      },
      {
         id: "amount",
         header: "AMOUNT",
         cell: ({ row }) => <LatestAssignment row={row} />,
      },
      {
         id: "address",
         header: "ADDRESS",
         cell: ({ row }) => <AddressCell row={row} />,
      },
      {
         id: "actions",
         header: "",
         cell: ({ row }) => {
            const rider = row.original;
            return (
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                     >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                     <DropdownMenuLabel>Actions</DropdownMenuLabel>
                     <DropdownMenuItem
                        onClick={() => openAssignDialog(rider.id)}
                     >
                        Assign to order
                     </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem
                        onClick={() => navigator.clipboard.writeText(rider.id)}
                     >
                        Copy ID
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            );
         },
      },
   ];

   const table = useReactTable({
      data: riders,
      columns,
      getCoreRowModel: getCoreRowModel(),
   });

   if (isLoading) return <div className="p-6">Loading riders...</div>;
   if (isError)
      return <div className="p-6 text-red-500">Failed to load riders.</div>;

   return (
      <ScrollArea className="h-[calc(100vh-2rem)] p-6 pb-20">
         <div>
            {/* Header styled like OrdersMetrics */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-7 sm:gap-2 mb-6">
               <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-[#023337]">
                     Rider List
                  </h1>
                  <p className="text-zinc-500 sm:hidden">
                     Track riders list across your store.
                  </p>
               </div>
               <div className="flex items-center gap-3">
                  <Link href="/admin/riders/new">
                     <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Rider
                     </Button>
                  </Link>
                  <Link href="/admin/riders/import">
                     <Button variant="outline">Import Riders</Button>
                  </Link>
               </div>
            </div>

            {/* Top amount card + Metrics Cards styled like OrdersMetrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
               <Card className="relative">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <h3 className="text-lg text-[#23272E] font-semibold">
                        Top Amount
                     </h3>
                     <div>
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 w-8 p-0"
                              >
                                 <span className="sr-only">Open menu</span>
                                 <MoreHorizontal className="h-4 w-4" />
                              </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                 onClick={() => refetch && refetch()}
                              >
                                 Refresh
                              </DropdownMenuItem>
                           </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-2 flex items-end gap-2">
                        <div className="text-3xl font-bold text-[#023337]">
                           {topAmount !== null
                              ? `${topAmount.toLocaleString()} RWF`
                              : "—"}
                        </div>
                     </div>
                     <div className="text-xs text-muted-foreground mt-2">
                        All time
                     </div>
                  </CardContent>
               </Card>
               <Card className="relative">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <h3 className="text-lg text-[#23272E] font-semibold">
                        Total Riders
                     </h3>
                     <div>
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 w-8 p-0"
                              >
                                 <span className="sr-only">Open menu</span>
                                 <MoreHorizontal className="h-4 w-4" />
                              </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                 onClick={() => refetch && refetch()}
                              >
                                 Refresh
                              </DropdownMenuItem>
                           </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-2 flex items-end gap-2">
                        <div className="text-3xl font-bold text-[#023337]">
                           {totalRiders}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                           <div className="flex items-center gap-1 text-green-600">
                              <TrendingUp className="h-3 w-3" />
                              <span>+0%</span>
                           </div>
                        </div>
                     </div>
                     <div className="text-xs text-muted-foreground mt-2">
                        Last 7 days
                     </div>
                  </CardContent>
               </Card>

               <Card className="relative">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <h3 className="text-lg text-[#23272E] font-semibold">
                        Active Riders
                     </h3>
                     <div>
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 w-8 p-0"
                              >
                                 <span className="sr-only">Open menu</span>
                                 <MoreHorizontal className="h-4 w-4" />
                              </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                 onClick={() => refetch && refetch()}
                              >
                                 Refresh
                              </DropdownMenuItem>
                           </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-2 flex items-end gap-2">
                        <div className="text-3xl font-bold text-[#023337]">
                           {activeRiders}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                           <div className="flex items-center gap-1 text-green-600">
                              <TrendingUp className="h-3 w-3" />
                              <span>+0%</span>
                           </div>
                        </div>
                     </div>
                     <div className="text-xs text-muted-foreground mt-2">
                        Last 7 days
                     </div>
                  </CardContent>
               </Card>

               <Card className="relative">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                     <h3 className="text-lg text-[#23272E] font-semibold">
                        Vehicles
                     </h3>
                     <div>
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 className="h-8 w-8 p-0"
                              >
                                 <span className="sr-only">Open menu</span>
                                 <MoreHorizontal className="h-4 w-4" />
                              </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                 onClick={() => refetch && refetch()}
                              >
                                 Refresh
                              </DropdownMenuItem>
                           </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-2 flex items-end gap-2">
                        <div className="text-3xl font-bold text-[#023337]">
                           {vehicles}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                           <div className="flex items-center gap-1 text-red-600">
                              <TrendingDown className="h-3 w-3" />
                              <span>0%</span>
                           </div>
                        </div>
                     </div>
                     <div className="text-xs text-muted-foreground mt-2">
                        Last 7 days
                     </div>
                  </CardContent>
               </Card>
            </div>

            <div className="p-5 rounded-2xl bg-white mt-6">
               {/* Header similar to OrdersTable */}
               <div className="flex items-center justify-between mb-4">
                  <div>
                     <h3 className="text-text-primary text-xl font-bold">
                        Riders
                     </h3>
                     <p className="text-text-secondary">
                        Manage your riders and assignments.
                     </p>
                  </div>
                  <div className="flex items-center gap-3">
                     <Link href="/admin/riders/new">
                        <Button className="bg-orange-600 text-white">
                           Export
                        </Button>
                     </Link>
                  </div>
               </div>

               <div className="-mx-5 md:mx-0 overflow-x-auto">
                  <div className="min-w-[700px]">
                     {/* ensures table can scroll on small screens */}
                     <DataTable table={table} />
                  </div>
               </div>
            </div>
            {activeRiderId && (
               <AssignOrderToRiderDialog
                  open={dialogOpen}
                  onOpenChange={(open) => {
                     setDialogOpen(open);
                     if (!open) setActiveRiderId(null);
                  }}
                  riderId={activeRiderId}
                  onAssigned={onAssigned}
               />
            )}
         </div>
         <ScrollBar orientation="horizontal" />
      </ScrollArea>
   );
};

export default RidersPage;

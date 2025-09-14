"use client";

import React from "react";
import Link from "next/link";
import useRiders, {
   useAssignOrder,
   useRiderAssignments,
} from "@/hooks/useRiders";
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
      <div className="p-6">
         <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Riders</h1>
            <div className="flex gap-3">
               <Link
                  href="/admin/riders/new"
                  className="px-4 py-2 bg-blue-600 text-white rounded"
               >
                  New Rider
               </Link>
            </div>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border rounded-lg">
               <div className="text-sm text-muted-foreground">Total Riders</div>
               <div className="text-2xl font-bold">{totalRiders}</div>
            </div>
            <div className="p-4 border rounded-lg">
               <div className="text-sm text-muted-foreground">
                  Active Riders
               </div>
               <div className="text-2xl font-bold">{activeRiders}</div>
            </div>
            <div className="p-4 border rounded-lg">
               <div className="text-sm text-muted-foreground">Vehicles</div>
               <div className="text-2xl font-bold">{vehicles}</div>
            </div>
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
                     <Button className="bg-blue-600 text-white">
                        New Rider
                     </Button>
                  </Link>
               </div>
            </div>

            <div>
               <DataTable table={table} />
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
   );
};

export default RidersPage;

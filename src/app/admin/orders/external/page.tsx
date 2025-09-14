"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useOrders } from "@/hooks/useOrders";
import { Order } from "@/types/orders";
import { format } from "date-fns";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Dot } from "lucide-react";
import { UserAvatarProfile } from "@/components/user-avatar-profile";
import { DataTable } from "@/components/orders/data-table";
import {
   Pagination,
   PaginationContent,
   PaginationEllipsis,
   PaginationItem,
   PaginationLink,
   PaginationNext,
   PaginationPrevious,
} from "@/components/ui/pagination";

interface ExternalOrderItem {
   product_name: string;
   quantity: number;
   price: number;
   variation_name?: string;
}

interface ExternalOrder {
   id: string;
   order_number?: string;
   customer_name: string;
   customer_email?: string;
   customer_phone: string;
   delivery_address: string;
   delivery_city: string;
   delivery_notes?: string;
   order_date: string;
   status: OrderStatus;
   total: number;
   source: "whatsapp" | "phone" | "other";
   items: ExternalOrderItem[];
}
import type { OrderStatus } from "@/types/orders";

const columns: ColumnDef<ExternalOrder>[] = [
   {
      accessorKey: "order_number",
      header: "ORDER",
      cell: ({ row }) => (
         <span className="text-text-primary">
            #{row.getValue("order_number") || row.original.id}
         </span>
      ),
   },
   {
      accessorKey: "order_date",
      header: "DATE",
      cell: ({ row }) =>
         format(new Date(row.getValue("order_date")), "MMM d, yyyy"),
   },
   {
      accessorKey: "customer_name",
      header: "CUSTOMER",
      cell: ({ row }) => {
         const order = row.original;
         return (
            <UserAvatarProfile
               user={{
                  fullName: order.customer_name,
                  subTitle: order.customer_phone,
               }}
               showInfo
            />
         );
      },
   },
   {
      accessorKey: "source",
      header: "SOURCE",
      cell: ({ row }) => (
         <Badge
            variant="secondary"
            className="capitalize"
         >
            {row.getValue("source")}
         </Badge>
      ),
   },
   {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ row }) => {
         const status = row.getValue("status") as string;
         return (
            <Badge
               className={cn("capitalize font-semibold", {
                  "bg-green-500/10 text-green-500": status === "delivered",
                  "bg-yellow-500/10 text-yellow-500":
                     status === "pending" || status === "processing",
                  "bg-red-500/10 text-red-500": status === "cancelled",
               })}
            >
               {status}
            </Badge>
         );
      },
   },
   {
      accessorKey: "total",
      header: "TOTAL",
      cell: ({ row }) => (
         <div className="font-medium">
            {row.getValue<number>("total").toLocaleString()} RWF
         </div>
      ),
   },
   {
      id: "actions",
      cell: ({ row }) => {
         const order = row.original;
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
                     onClick={() => navigator.clipboard.writeText(order.id)}
                  >
                     Copy order ID
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>View order details</DropdownMenuItem>
                  <DropdownMenuItem>Update status</DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>
         );
      },
   },
];

export default function ExternalOrdersPage() {
   const { useAllOrders } = useOrders();
   const [search, setSearch] = useState("");
   const [page, setPage] = useState(1);
   const [limit, setLimit] = useState(50);

   const { data: ordersResponse, isLoading } = useAllOrders({
      filters: { isExternal: true, search: search || undefined },
      pagination: { page, limit },
      sort: { column: "created_at", direction: "desc" },
   });

   const totalCount = ordersResponse?.count || 0;
   const totalPages = Math.max(1, Math.ceil(totalCount / limit));
   const rangeStart = totalCount === 0 ? 0 : (page - 1) * limit + 1;
   const rangeEnd = Math.min(totalCount, page * limit);

   // Map backend Order -> ExternalOrder shape used by this table
   const ordersData: ExternalOrder[] = (ordersResponse?.data || [])
      .map((o: Order) => ({
         id: o.id,
         order_number: o.order_number || undefined,
         customer_name:
            `${o.customer_first_name} ${o.customer_last_name}`.trim(),
         customer_email: o.customer_email || undefined,
         customer_phone: o.customer_phone || "",
         delivery_address: o.delivery_address,
         delivery_city: o.delivery_city,
         delivery_notes: o.delivery_notes || undefined,
         order_date: o.created_at,
         status: o.status,
         total: o.total,
         source: (o.source as "whatsapp" | "phone" | "other") || "other",
         items:
            o.items?.map((it) => ({
               product_name: it.product_name,
               quantity: it.quantity,
               price: it.price,
               variation_name: it.variation_name || undefined,
            })) || [],
      }))
      .filter(Boolean);

   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(1);
   };

   const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
   };

   const getPageNumbers = () => {
      const pages: number[] = [];
      const start = Math.max(1, page - 2);
      const end = Math.min(totalPages, page + 2);
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
   };

   return (
      <ScrollArea className="bg-surface-secondary h-[calc(100vh-5rem)]">
         <div className="px-5 sm:px-10 py-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
               <div>
                  <h1 className="text-2xl font-bold text-[#023337]">
                     External Orders
                  </h1>
                  <p className="text-gray-600">
                     Manage orders from WhatsApp and other external sources
                  </p>
               </div>
               <Link href="/admin/orders/external/add">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white mt-4 sm:mt-0">
                     <PlusCircle className="h-4 w-4 mr-2" />
                     Add External Order
                  </Button>
               </Link>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-lg mb-6">
               <div className="flex gap-4 items-center">
                  <div className="flex-1">
                     <Input
                        placeholder="Search orders..."
                        value={search}
                        onChange={handleSearchChange}
                        className="max-w-xs"
                     />
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="text-sm text-muted-foreground">
                        Showing {rangeStart}-{rangeEnd} of {totalCount}
                     </div>
                     <select
                        value={limit}
                        onChange={(e) => {
                           const v = Number(e.target.value) || 50;
                           setLimit(v);
                           setPage(1);
                        }}
                        className="rounded border px-2 py-1 text-sm"
                        aria-label="Rows per page"
                     >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                     </select>
                     <Button variant="outline">Export</Button>
                  </div>
               </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg">
               <DataTable
                  columns={columns}
                  data={ordersData}
               />
            </div>
            <div className="mt-4">
               <Pagination>
                  <PaginationContent>
                     <PaginationItem>
                        <PaginationPrevious
                           href="#"
                           onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(page - 1);
                           }}
                           className={
                              page === 1 ? "pointer-events-none opacity-50" : ""
                           }
                        />
                     </PaginationItem>
                     {getPageNumbers().map((p) => (
                        <PaginationItem key={p}>
                           <PaginationLink
                              href="#"
                              isActive={p === page}
                              onClick={(e) => {
                                 e.preventDefault();
                                 handlePageChange(p);
                              }}
                           >
                              {p}
                           </PaginationLink>
                        </PaginationItem>
                     ))}
                     {page + 2 < totalPages && (
                        <PaginationItem>
                           <PaginationEllipsis />
                        </PaginationItem>
                     )}
                     <PaginationItem>
                        <PaginationNext
                           href="#"
                           onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(page + 1);
                           }}
                           className={
                              page === totalPages
                                 ? "pointer-events-none opacity-50"
                                 : ""
                           }
                        />
                     </PaginationItem>
                  </PaginationContent>
               </Pagination>
            </div>
         </div>
      </ScrollArea>
   );
}

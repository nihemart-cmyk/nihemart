"use client";

import React, { useState, useEffect, useMemo } from "react";
import { DataTable } from "./data-table";
import { ManageRefundDialog } from "./ManageRefundDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
   Pagination,
   PaginationContent,
   PaginationItem,
   PaginationLink,
   PaginationPrevious,
   PaginationNext,
} from "@/components/ui/pagination";

export default function OrderRefundsTable() {
   const [page, setPage] = useState(1);
   const limit = 10; // fixed page size to match admin/orders
   const [statusFilter, setStatusFilter] = useState<string | undefined>(
      undefined
   );
   const [orders, setOrders] = useState<any[]>([]);
   const [count, setCount] = useState(0);
   const [loading, setLoading] = useState(false);

   const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
   const [dialogOpen, setDialogOpen] = useState(false);

   const fetchOrders = async () => {
      setLoading(true);
      try {
         const q = new URLSearchParams();
         q.set("page", String(page));
         q.set("limit", String(limit));
         q.set("type", "orders");
         if (statusFilter) q.set("refundStatus", statusFilter);

         const res = await fetch(`/api/admin/refunds?${q.toString()}`);
         if (!res.ok) throw new Error("Failed to load order refunds");
         const json = await res.json();
         setOrders(json.data || []);
         setCount(json.count || 0);
      } catch (err: any) {
         console.error("Failed to fetch order refunds:", err);
         toast.error(err?.message || "Failed to load order refunds");
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      fetchOrders();
   }, [page, statusFilter]);

   const totalPages = Math.max(1, Math.ceil(count / limit));
   const getPageNumbers = () => {
      const pages: number[] = [];
      const start = Math.max(1, page - 2);
      const end = Math.min(totalPages, page + 2);
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
   };

   const columns = useMemo(
      () => [
         { accessorKey: "id", header: "ID" },
         {
            id: "order_number",
            header: "ORDER",
            cell: ({ row }: any) =>
               row.original.order_number || row.original.id,
         },
         {
            id: "customer",
            header: "CUSTOMER",
            cell: ({ row }: any) =>
               `${row.original.customer_first_name || ""} ${
                  row.original.customer_last_name || ""
               }`,
         },
         {
            accessorKey: "total",
            header: "AMOUNT",
            cell: ({ row }: any) =>
               `${
                  row.getValue("total")?.toLocaleString?.() ||
                  row.getValue("total") ||
                  0
               } RWF`,
         },
         { accessorKey: "refund_status", header: "STATUS" },
         {
            id: "reason",
            header: "REASON",
            cell: ({ row }: any) => row.original.refund_reason || "-",
         },
         {
            id: "actions",
            header: "ACTIONS",
            cell: ({ row }: any) => (
               <div className="flex gap-2">
                  <Button
                     size="sm"
                     onClick={() => {
                        setSelectedOrder(row.original);
                        setDialogOpen(true);
                     }}
                  >
                     Manage
                  </Button>
               </div>
            ),
         },
      ],
      []
   );

   return (
      <div className="p-5 rounded-2xl bg-white mt-10">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Order Refund Requests</h3>
            <div className="flex items-center gap-2">
               <select
                  value={statusFilter || ""}
                  onChange={(e) => setStatusFilter(e.target.value || undefined)}
                  className="border rounded px-2 py-1"
               >
                  <option value="">All</option>
                  <option value="requested">Requested</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
               </select>
            </div>
         </div>

         <DataTable
            columns={columns as any}
            data={orders as any}
         />

         <div className="flex items-center justify-between mt-4">
            <div />

            <Pagination className="mt-2">
               <PaginationContent>
                  <PaginationItem>
                     <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                           e.preventDefault();
                           setPage(Math.max(1, page - 1));
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
                              setPage(p);
                           }}
                        >
                           {p}
                        </PaginationLink>
                     </PaginationItem>
                  ))}

                  <PaginationItem>
                     <PaginationNext
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                     />
                  </PaginationItem>
               </PaginationContent>
            </Pagination>
         </div>

         <ManageRefundDialog
            open={dialogOpen}
            onOpenChange={(v) => setDialogOpen(v)}
            order={selectedOrder || { id: null }}
            item={null}
         />
      </div>
   );
}

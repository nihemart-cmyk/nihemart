"use client";

import { useMemo, useState, useEffect } from "react";
import { DataTable } from "./data-table"; // Assuming you have a reusable DataTable
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Phone, MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import {
   Pagination,
   PaginationContent,
   PaginationEllipsis,
   PaginationItem,
   PaginationLink,
   PaginationNext,
   PaginationPrevious,
} from "@/components/ui/pagination";
import { createCustomerColumns, type Customer } from "./customer-columns"; // Adjust path if needed
import { useUsers } from "@/hooks/useUsers";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
   Select,
   SelectTrigger,
   SelectContent,
   SelectItem,
   SelectValue,
} from "../ui/select";

// Remove mockCustomers, use real data from useUsers

const getInitials = (name: string) => {
   return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
};

export function CustomerTable() {
   const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
      null
   );
   const [viewCustomerModalOpened, setViewCustomerModalOpened] =
      useState<boolean>(false);
   const { users, loading, error, fetchUsers, updateUserRole, deleteUser } =
      useUsers();

   // Filters & pagination state
   const [search, setSearch] = useState("");
   const [statusFilter, setStatusFilter] = useState<string>("all");
   const [page, setPage] = useState<number>(1);
   const [limit, setLimit] = useState<number>(10);

   useEffect(() => {
      fetchUsers();
   }, [fetchUsers]);

   const handleViewCustomer = (customer: Customer) => {
      setSelectedCustomer(customer);
      setViewCustomerModalOpened(true);
   };

   const handleCloseModal = () => {
      setViewCustomerModalOpened(false);
   };

   // Map users to Customer type for DataTable using actual fields from useUsers
   const customers: Customer[] = users.map((u) => ({
      id: u.id,
      name: u.full_name || u.email,
      email: u.email,
      phone: u.phone || "",
      location: (u as any).city || "",
      orderCount: u.orderCount || 0,
      totalSpend: u.totalSpend || 0,
      status: u.role === "admin" ? "VIP" : "Active",
      role: u.role,
      totalOrders: u.orderCount || 0,
      completedOrders: (u as any).completedOrders || 0,
      cancelledOrders: (u as any).cancelledOrders || 0,
   }));

   // Derived: filtered and paginated customers
   const filteredCustomers = useMemo(() => {
      const q = search.trim().toLowerCase();
      return customers.filter((c) => {
         if (statusFilter !== "all") {
            // support role-based filtering (admin, rider, user)
            if (statusFilter === "admin" && c.role !== "admin") return false;
            if (statusFilter === "rider" && c.role !== "rider") return false;
            if (statusFilter === "user" && c.role !== "user") return false;
         }
         if (!q) return true;
         return (
            (c.name || "").toLowerCase().includes(q) ||
            (c.email || "").toLowerCase().includes(q) ||
            (c.phone || "").toLowerCase().includes(q)
         );
      });
   }, [customers, search, statusFilter]);

   const totalCount = filteredCustomers.length;
   const totalPages = Math.max(1, Math.ceil(totalCount / limit));
   useEffect(() => {
      if (page > totalPages) setPage(totalPages);
   }, [page, totalPages]);

   const paginated = useMemo(() => {
      const start = (page - 1) * limit;
      return filteredCustomers.slice(start, start + limit);
   }, [filteredCustomers, page, limit]);

   const columns = useMemo(
      () =>
         createCustomerColumns(
            handleViewCustomer,
            async (customerId: string, makeAdmin?: boolean) => {
               // Toggle role
               const role = makeAdmin ? "admin" : "user";
               await updateUserRole(customerId, role as any);
            },
            async (customerId: string) => {
               // Soft delete user (do not remove from auth by default)
               await deleteUser(customerId, false);
            }
         ),
      [handleViewCustomer, updateUserRole, deleteUser]
   );

   return (
      <>
         <Card>
            <CardHeader>
               <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                     <CardTitle className="text-xl font-semibold">
                        Customer Details
                     </CardTitle>
                     <div className="text-sm text-muted-foreground">
                        {totalCount} customers
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <Input
                        placeholder="Search customer or email"
                        value={search}
                        onChange={(e) => {
                           setSearch(e.target.value);
                           setPage(1);
                        }}
                        className="max-w-xs"
                     />
                     <Select
                        value={statusFilter}
                        onValueChange={(v) => {
                           setStatusFilter(v);
                           setPage(1);
                        }}
                     >
                        <SelectTrigger className="w-40">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="all">All</SelectItem>
                           <SelectItem value="admin">Admin</SelectItem>
                           {/* <SelectItem value="rider">Rider</SelectItem> */}
                           <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>
            </CardHeader>
            <CardContent>
               {loading ? (
                  <div className="py-10 text-center">Loading users...</div>
               ) : error ? (
                  <div className="py-10 text-center text-red-500">{error}</div>
               ) : (
                  <>
                     <DataTable
                        columns={columns}
                        data={paginated}
                     />
                     <div className="mt-4 flex items-center justify-end">
                        <Pagination>
                           <PaginationContent>
                              <PaginationItem>
                                 <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                       e.preventDefault();
                                       setPage(Math.max(1, page - 1));
                                    }}
                                    className={
                                       page === 1
                                          ? "pointer-events-none opacity-50"
                                          : ""
                                    }
                                 />
                              </PaginationItem>
                              {Array.from({ length: totalPages }).map(
                                 (_, i) => {
                                    const p = i + 1;
                                    return (
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
                                    );
                                 }
                              )}
                              <PaginationItem>
                                 <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                       e.preventDefault();
                                       setPage(Math.min(totalPages, page + 1));
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
                  </>
               )}
            </CardContent>
         </Card>

         {/* Customer Detail Modal (remains the same) */}
         <Dialog
            open={viewCustomerModalOpened}
            onOpenChange={handleCloseModal}
         >
            <DialogContent className="sm:max-w-md">
               <>
                  <DialogHeader>
                     <DialogTitle className="sr-only">
                        Customer Details
                     </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                     <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                           {getInitials(selectedCustomer?.name ?? "")}
                        </div>
                        <div>
                           <h3 className="font-semibold text-lg">
                              {selectedCustomer?.name}
                           </h3>
                           <p className="text-gray-600 text-sm">
                              {selectedCustomer?.email}
                           </p>
                        </div>
                     </div>
                     <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">
                           Customer Info
                        </h4>
                        <div className="space-y-3">
                           <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">
                                 {selectedCustomer?.phone}
                              </span>
                           </div>
                           <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">
                                 {selectedCustomer?.location}
                              </span>
                           </div>
                        </div>
                     </div>
                     <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-3">
                           Order overview
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                           <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                 {selectedCustomer?.totalOrders}
                              </div>
                              <div className="text-xs text-blue-600">
                                 Total order
                              </div>
                           </div>
                           <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                 {selectedCustomer?.completedOrders}
                              </div>
                              <div className="text-xs text-green-600">
                                 Completed
                              </div>
                           </div>
                           <div className="text-center">
                              <div className="text-2xl font-bold text-red-600">
                                 {selectedCustomer?.cancelledOrders}
                              </div>
                              <div className="text-xs text-red-600">
                                 Cancelled
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </>
            </DialogContent>
         </Dialog>
      </>
   );
}

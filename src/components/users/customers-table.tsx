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

   // Map users to Customer type for DataTable
   const customers: Customer[] = users.map((u) => ({
      id: u.id,
      name: u.full_name || u.email,
      email: u.email,
      phone: u.phone || "",
      location: "", // Add location if available
      orderCount: u.orderCount || 0,
      totalSpend: u.totalSpend || 0,
      status: u.role === "admin" ? "VIP" : "Active",
      totalOrders: u.orderCount || 0,
      completedOrders: 0,
      cancelledOrders: 0,
   }));

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
               <CardTitle className="text-xl font-semibold">
                  Customer Details
               </CardTitle>
            </CardHeader>
            <CardContent>
               {loading ? (
                  <div className="py-10 text-center">Loading users...</div>
               ) : error ? (
                  <div className="py-10 text-center text-red-500">{error}</div>
               ) : (
                  <DataTable
                     columns={columns}
                     data={customers}
                  />
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

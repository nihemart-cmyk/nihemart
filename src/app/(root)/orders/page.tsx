"use client";

import { useState } from "react";
import {
   Package,
   Eye,
   Calendar,
   MapPin,
   Search,
   Filter,
   Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@/types/orders";

const Orders = () => {
   const { t } = useLanguage();
   const { isLoggedIn } = useAuth();
   const router = useRouter();

   const [filters, setFilters] = useState({
      search: "",
      status: "all" as OrderStatus | "all",
      page: 1,
   });

   const { useUserOrders } = useOrders();

   const {
      data: ordersData,
      isLoading,
      isError,
      error,
   } = useUserOrders({
      filters: {
         search: filters.search || undefined,
         status: filters.status !== "all" ? filters.status : undefined,
      },
      pagination: {
         page: filters.page,
         limit: 10,
      },
      sort: {
         column: "created_at",
         direction: "desc",
      },
   });

   // Redirect if not logged in
   if (!isLoggedIn) {
      return (
         <div className="container mx-auto px-16 py-8">
            <div className="text-center py-12">
               <Package className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
               <h1 className="text-3xl font-bold mb-4">Please Log In</h1>
               <p className="text-muted-foreground mb-8">
                  You need to be logged in to view your orders.
               </p>
               <Button
                  onClick={() => router.push("/auth/login?redirect=/orders")}
               >
                  Log In
               </Button>
            </div>
         </div>
      );
   }

   const getStatusBadge = (status?: string) => {
      if (!status) return <Badge variant="secondary">Unknown</Badge>;

      const variants = {
         pending: "secondary",
         processing: "default",
         shipped: "secondary",
         delivered: "default",
         cancelled: "destructive",
      };

      const colors = {
         pending: "bg-yellow-100 text-yellow-800",
         processing: "bg-blue-100 text-blue-800",
         shipped: "bg-purple-100 text-purple-800",
         delivered: "bg-green-100 text-green-800",
         cancelled: "bg-red-100 text-red-800",
      };

      return (
         <Badge
            variant={variants[status as keyof typeof variants] as any}
            className={colors[status as keyof typeof colors]}
         >
            {status.charAt(0).toUpperCase() + status.slice(1)}
         </Badge>
      );
   };

   const handleSearch = (value: string) => {
      setFilters((prev) => ({ ...prev, search: value, page: 1 }));
   };

   const handleStatusFilter = (value: string) => {
      setFilters((prev) => ({
         ...prev,
         status: value as OrderStatus | "all",
         page: 1,
      }));
   };

   const handlePageChange = (page: number) => {
      setFilters((prev) => ({ ...prev, page }));
   };

   if (isError) {
      return (
         <div className="container mx-auto px-16 py-8">
            <div className="text-center py-12">
               <Package className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
               <h1 className="text-3xl font-bold mb-4">Error Loading Orders</h1>
               <p className="text-muted-foreground mb-8">
                  {error?.message ||
                     "Failed to load orders. Please try again later."}
               </p>
               <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
         </div>
      );
   }

   return (
      <div className="container mx-auto px-16 py-8">
         <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">{t("nav.orders")}</h1>
            <div className="flex gap-4">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                     placeholder="Search orders..."
                     value={filters.search}
                     onChange={(e) => handleSearch(e.target.value)}
                     className="pl-9 w-64"
                  />
               </div>
               <Select
                  value={filters.status}
                  onValueChange={handleStatusFilter}
               >
                  <SelectTrigger className="w-40">
                     <Filter className="h-4 w-4 mr-2" />
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="all">All Status</SelectItem>
                     <SelectItem value="pending">Pending</SelectItem>
                     <SelectItem value="processing">Processing</SelectItem>
                     <SelectItem value="shipped">Shipped</SelectItem>
                     <SelectItem value="delivered">Delivered</SelectItem>
                     <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
               </Select>
            </div>
         </div>

         {isLoading ? (
            <div className="flex justify-center items-center py-12">
               <Loader2 className="h-8 w-8 animate-spin" />
               <span className="ml-2">Loading orders...</span>
            </div>
         ) : !ordersData?.data || ordersData.data.length === 0 ? (
            <div className="text-center py-12">
               <Package className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
               <h2 className="text-2xl font-bold mb-4">
                  {filters.search || filters.status !== "all"
                     ? "No orders found"
                     : "No orders yet"}
               </h2>
               <p className="text-muted-foreground mb-8">
                  {filters.search || filters.status !== "all"
                     ? "Try adjusting your search or filters"
                     : "Start shopping to see your orders here!"}
               </p>
               {filters.search || filters.status !== "all" ? (
                  <Button
                     onClick={() =>
                        setFilters({ search: "", status: "all", page: 1 })
                     }
                  >
                     Clear Filters
                  </Button>
               ) : (
                  <Button onClick={() => router.push("/")}>
                     Start Shopping
                  </Button>
               )}
            </div>
         ) : (
            <>
               <div className="space-y-6">
                  {ordersData.data.map((order) => (
                     <Card key={order.id}>
                        <CardHeader>
                           <div className="flex justify-between items-start">
                              <div>
                                 <CardTitle className="text-lg">
                                    Order #{order.order_number}
                                 </CardTitle>
                                 <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                                    <div className="flex items-center">
                                       <Calendar className="h-4 w-4 mr-1" />
                                       {new Date(
                                          order.created_at
                                       ).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center">
                                       <MapPin className="h-4 w-4 mr-1" />
                                       {order.delivery_city}
                                    </div>
                                 </div>
                              </div>
                              <div className="text-right">
                                 {getStatusBadge(order.status)}
                                 <p className="text-lg font-bold mt-2">
                                    {Number(order.total).toLocaleString()} RWF
                                 </p>
                              </div>
                           </div>
                        </CardHeader>
                        <CardContent>
                           <div className="space-y-3">
                              {order.items && order.items.length > 0 ? (
                                 order.items.slice(0, 3).map((item, index) => (
                                    <div
                                       key={index}
                                       className="flex justify-between items-center py-2 border-b last:border-b-0"
                                    >
                                       <div>
                                          <p className="font-medium">
                                             {item.product_name}
                                          </p>
                                          {item.variation_name && (
                                             <p className="text-sm text-muted-foreground">
                                                {item.variation_name}
                                             </p>
                                          )}
                                          <p className="text-sm text-muted-foreground">
                                             Quantity: {item.quantity}
                                          </p>
                                       </div>
                                       <p className="font-medium">
                                          {Number(item.total).toLocaleString()}{" "}
                                          RWF
                                       </p>
                                    </div>
                                 ))
                              ) : (
                                 <div className="py-2 text-muted-foreground">
                                    No items found
                                 </div>
                              )}
                              {order.items && order.items.length > 3 && (
                                 <p className="text-sm text-muted-foreground">
                                    +{order.items.length - 3} more items
                                 </p>
                              )}
                           </div>
                           <div className="flex justify-between items-center mt-4">
                              <div className="text-sm text-muted-foreground">
                                 Customer: {order.customer_first_name}{" "}
                                 {order.customer_last_name}
                              </div>
                              <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() =>
                                    router.push(`/orders/${order.id}`)
                                 }
                              >
                                 <Eye className="h-4 w-4 mr-2" />
                                 View Details
                              </Button>
                           </div>
                        </CardContent>
                     </Card>
                  ))}
               </div>

               {/* Pagination */}
               {ordersData && ordersData.count > 10 && (
                  <div className="flex justify-center items-center space-x-2 mt-8">
                     <Button
                        variant="outline"
                        onClick={() => handlePageChange(filters.page - 1)}
                        disabled={filters.page === 1}
                     >
                        Previous
                     </Button>

                     <span className="text-sm text-muted-foreground">
                        Page {filters.page} of{" "}
                        {Math.ceil(ordersData.count / 10)}
                     </span>

                     <Button
                        variant="outline"
                        onClick={() => handlePageChange(filters.page + 1)}
                        disabled={
                           filters.page >= Math.ceil(ordersData.count / 10)
                        }
                     >
                        Next
                     </Button>
                  </div>
               )}
            </>
         )}
      </div>
   );
};

export default Orders;

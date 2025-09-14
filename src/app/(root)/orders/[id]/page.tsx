"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";
import {
   Loader2,
   Package,
   Truck,
   CheckCircle,
   Clock,
   X,
   ArrowLeft,
   MapPin,
   Mail,
   Phone,
   User,
   Calendar,
   Hash,
} from "lucide-react";
import { toast } from "sonner";

const OrderDetails = () => {
   const { t } = useLanguage();
   const { user, isLoggedIn, hasRole } = useAuth();
   const { useOrder, updateOrderStatus } = useOrders();
   const router = useRouter();
   const params = useParams();
   const orderId = params?.id as string;

   const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

   const { data: order, isLoading, error } = useOrder(orderId);
   const isAdmin = hasRole("admin");

   // Redirect if not logged in
   if (!isLoggedIn) {
      router.push("/signin?redirect=/orders/" + orderId);
      return null;
   }

   // Loading state
   if (isLoading) {
      return (
         <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center py-12">
               <Loader2 className="h-8 w-8 animate-spin" />
               <span className="ml-2">Loading order details...</span>
            </div>
         </div>
      );
   }

   // Error state
   if (error || !order) {
      return (
         <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
               <Package className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
               <h1 className="text-3xl font-bold mb-4">Order Not Found</h1>
               <p className="text-muted-foreground mb-8">
                  The order you&aps;re looking for doesn&aps;t exist or you
                  don&aps;t have permission to view it.
               </p>
               <Button onClick={() => router.push("/")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Home
               </Button>
            </div>
         </div>
      );
   }

   // Check if user has permission to view this order
   if (!isAdmin && order.user_id !== user?.id) {
      return (
         <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
               <X className="h-24 w-24 text-red-500 mx-auto mb-6" />
               <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
               <p className="text-muted-foreground mb-8">
                  You don&apos;t have permission to view this order.
               </p>
               <Button onClick={() => router.push("/")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Home
               </Button>
            </div>
         </div>
      );
   }

   const getStatusColor = (status?: string) => {
      if (!status) return "bg-gray-500";
      switch (status) {
         case "pending":
            return "bg-yellow-500";
         case "processing":
            return "bg-blue-500";
         case "shipped":
            return "bg-purple-500";
         case "delivered":
            return "bg-green-500";
         case "cancelled":
            return "bg-red-500";
         default:
            return "bg-gray-500";
      }
   };

   const getStatusIcon = (status?: string) => {
      if (!status) return <Clock className="h-4 w-4" />;
      switch (status) {
         case "pending":
            return <Clock className="h-4 w-4" />;
         case "processing":
            return <Package className="h-4 w-4" />;
         case "shipped":
            return <Truck className="h-4 w-4" />;
         case "delivered":
            return <CheckCircle className="h-4 w-4" />;
         case "cancelled":
            return <X className="h-4 w-4" />;
         default:
            return <Clock className="h-4 w-4" />;
      }
   };

   const handleStatusUpdate = async (newStatus: string) => {
      if (isUpdatingStatus) return;

      setIsUpdatingStatus(true);
      try {
         await updateOrderStatus.mutateAsync({
            id: orderId,
            status: newStatus as any,
         });
         toast.success(`Order status updated to ${newStatus}`);
      } catch (error) {
         console.error("Failed to update order status:", error);
         toast.error("Failed to update order status");
      } finally {
         setIsUpdatingStatus(false);
      }
   };

   const generateWhatsAppMessage = () => {
      const productDetails =
         order.items
            ?.map(
               (item) =>
                  `${item.product_name}${
                     item.variation_name ? ` (${item.variation_name})` : ""
                  } x${item.quantity} - ${item.total.toLocaleString()} RWF`
            )
            .join("\n") || "";

      const message = `
*Order Inquiry - #${order.order_number}*

Hello, I have a question about my order:

*Order Details:*
Order Number: ${order.order_number}
Status: ${(order.status || "unknown").toUpperCase()}
Total: ${order.total.toLocaleString()} RWF

*Products:*
${productDetails}

*Delivery Address:*
${order.delivery_address}, ${order.delivery_city}

Please let me know if you need any additional information.
    `;
      return encodeURIComponent(message);
   };

   const handleWhatsAppContact = () => {
      const phoneNumber = "250784148374";
      const message = generateWhatsAppMessage();
      const url = `https://wa.me/${phoneNumber}?text=${message}`;
      window.open(url, "_blank");
   };

   const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString("en-US", {
         year: "numeric",
         month: "long",
         day: "numeric",
         hour: "2-digit",
         minute: "2-digit",
      });
   };

   return (
      <div className="container mx-auto px-4 py-8">
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div className="flex items-center space-x-4">
               <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
               >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
               </Button>
               <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">
                     Order #{order.order_number}
                  </h1>
                  <p className="text-muted-foreground text-sm sm:text-base">
                     Placed on {formatDate(order.created_at)}
                  </p>
               </div>
            </div>

            <div className="flex items-center space-x-3">
               <Badge
                  className={getStatusColor(order.status)}
                  variant="secondary"
               >
                  {getStatusIcon(order.status)}
                  <span className="ml-2 capitalize">
                     {order.status || "unknown"}
                  </span>
               </Badge>

               <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWhatsAppContact}
               >
                  Contact Support
               </Button>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
               {/* Order Items */}
               <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center">
                        <Package className="h-5 w-5 mr-2" />
                        Order Items
                     </CardTitle>
                  </CardHeader>
                  <CardContent>
                     {order.items && order.items.length > 0 ? (
                        <div className="space-y-4">
                           {order.items.map((item) => (
                              <div
                                 key={item.id}
                                 className="flex flex-col sm:flex-row justify-between items-start p-4 border rounded-lg"
                              >
                                 <div className="flex-1 w-full">
                                    <h4 className="font-semibold">
                                       {item.product_name}
                                    </h4>
                                    {item.variation_name && (
                                       <p className="text-sm text-muted-foreground">
                                          Variation: {item.variation_name}
                                       </p>
                                    )}
                                    {item.product_sku && (
                                       <p className="text-sm text-muted-foreground">
                                          SKU: {item.product_sku}
                                       </p>
                                    )}
                                    <div className="flex items-center space-x-4 mt-2">
                                       <span className="text-sm">
                                          Qty: {item.quantity}
                                       </span>
                                       <span className="text-sm">
                                          Unit Price:{" "}
                                          {item.price.toLocaleString()} RWF
                                       </span>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="font-semibold">
                                       {item.total.toLocaleString()} RWF
                                    </p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <p className="text-muted-foreground">
                           No items found for this order.
                        </p>
                     )}
                  </CardContent>
               </Card>

               {/* Order Timeline */}
               <Card>
                  <CardHeader>
                     <CardTitle>Order Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                           <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                 <CheckCircle className="h-4 w-4 text-white" />
                              </div>
                           </div>
                           <div>
                              <p className="font-semibold">Order Placed</p>
                              <p className="text-sm text-muted-foreground">
                                 {formatDate(order.created_at)}
                              </p>
                           </div>
                        </div>

                        {order.status !== "pending" && (
                           <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                 <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <Package className="h-4 w-4 text-white" />
                                 </div>
                              </div>
                              <div>
                                 <p className="font-semibold">
                                    Order Processing
                                 </p>
                                 <p className="text-sm text-muted-foreground">
                                    Being prepared for shipping
                                 </p>
                              </div>
                           </div>
                        )}

                        {order.shipped_at && (
                           <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                 <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                    <Truck className="h-4 w-4 text-white" />
                                 </div>
                              </div>
                              <div>
                                 <p className="font-semibold">Order Shipped</p>
                                 <p className="text-sm text-muted-foreground">
                                    {formatDate(order.shipped_at)}
                                 </p>
                              </div>
                           </div>
                        )}

                        {order.delivered_at && (
                           <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                 <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-4 w-4 text-white" />
                                 </div>
                              </div>
                              <div>
                                 <p className="font-semibold">
                                    Order Delivered
                                 </p>
                                 <p className="text-sm text-muted-foreground">
                                    {formatDate(order.delivered_at)}
                                 </p>
                              </div>
                           </div>
                        )}
                     </div>
                  </CardContent>
               </Card>
            </div>

            <div className="space-y-6">
               {/* Order Summary */}
               <Card>
                  <CardHeader>
                     <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                     <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{order.subtotal.toLocaleString()} RWF</span>
                     </div>
                     <div className="flex justify-between">
                        <span>Tax/Transport</span>
                        <span>{(order.tax || 0).toLocaleString()} RWF</span>
                     </div>
                     <Separator />
                     <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{order.total.toLocaleString()} RWF</span>
                     </div>
                  </CardContent>
               </Card>

               {/* Customer Information */}
               <Card>
                  <CardHeader>
                     <CardTitle>Customer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                     <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>
                           {order.customer_first_name}{" "}
                           {order.customer_last_name}
                        </span>
                     </div>
                     <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{order.customer_email}</span>
                     </div>
                     {order.customer_phone && (
                        <div className="flex items-center space-x-2">
                           <Phone className="h-4 w-4 text-muted-foreground" />
                           <span>{order.customer_phone}</span>
                        </div>
                     )}
                  </CardContent>
               </Card>

               {/* Delivery Information */}
               <Card>
                  <CardHeader>
                     <CardTitle>Delivery Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                     <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                           <p>{order.delivery_address}</p>
                           <p className="text-muted-foreground">
                              {order.delivery_city}
                           </p>
                        </div>
                     </div>
                     {order.delivery_notes && (
                        <div>
                           <p className="text-sm font-semibold">
                              Delivery Notes:
                           </p>
                           <p className="text-sm text-muted-foreground">
                              {order.delivery_notes}
                           </p>
                        </div>
                     )}
                  </CardContent>
               </Card>

               {/* Admin Controls */}
               {isAdmin && (
                  <Card>
                     <CardHeader>
                        <CardTitle>Admin Controls</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                           {order.status === "pending" && (
                              <Button
                                 size="sm"
                                 onClick={() =>
                                    handleStatusUpdate("processing")
                                 }
                                 disabled={isUpdatingStatus}
                              >
                                 {isUpdatingStatus ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                 ) : (
                                    "Mark Processing"
                                 )}
                              </Button>
                           )}

                           {order.status === "processing" && (
                              <Button
                                 size="sm"
                                 onClick={() => handleStatusUpdate("shipped")}
                                 disabled={isUpdatingStatus}
                              >
                                 {isUpdatingStatus ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                 ) : (
                                    "Mark Shipped"
                                 )}
                              </Button>
                           )}

                           {order.status === "shipped" && (
                              <Button
                                 size="sm"
                                 onClick={() => handleStatusUpdate("delivered")}
                                 disabled={isUpdatingStatus}
                              >
                                 {isUpdatingStatus ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                 ) : (
                                    "Mark Delivered"
                                 )}
                              </Button>
                           )}

                           {order.status &&
                              ["pending", "processing"].includes(
                                 order.status
                              ) && (
                                 <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                       handleStatusUpdate("cancelled")
                                    }
                                    disabled={isUpdatingStatus}
                                 >
                                    {isUpdatingStatus ? (
                                       <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                       "Cancel Order"
                                    )}
                                 </Button>
                              )}
                        </div>
                     </CardContent>
                  </Card>
               )}
            </div>
         </div>
      </div>
   );
};

export default OrderDetails;

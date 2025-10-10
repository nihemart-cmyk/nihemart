"use client";

import { useState, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogFooter,
   DialogTitle,
   DialogDescription,
} from "@/components/ui/dialog";
import {
   AlertDialog,
   AlertDialogContent,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
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
   User as UserIcon,
   Calendar,
   MessageCircle,
   RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { type Order } from "@/integrations/supabase/orders";
import { type User } from "@supabase/supabase-js";
import PaymentInfoCard from "@/components/payments/PaymentInfoCard";

interface OrderClientPageProps {
   initialData: Order;
   user: User;
   isAdmin: boolean;
}

const OrderClientPage = ({ initialData, user, isAdmin }: OrderClientPageProps) => {
   const { t } = useLanguage();
   const {
      updateOrderStatus,
      useRequestRefundItem,
      useCancelRefundRequestItem,
      useRespondRefundRequest,
      useRequestRefundOrder,
      useCancelRefundRequestOrder,
   } = useOrders();
   const router = useRouter();

   // Use optimistic updates for better UX
   const [optimisticOrder, setOptimisticOrder] = useOptimistic(initialData);
   
   const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
   const [showCancelConfirm, setShowCancelConfirm] = useState(false);
   const [redirectAfterCancel, setRedirectAfterCancel] = useState(true);
   const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
   const [rejectReason, setRejectReason] = useState("");
   const [rejectingItemId, setRejectingItemId] = useState<string | null>(null);
   const [isRejecting, setIsRejecting] = useState(false);
   const [fullRefundDialogOpen, setFullRefundDialogOpen] = useState(false);
   const [fullRefundReason, setFullRefundReason] = useState("");
   const [isRequestingFullRefund, setIsRequestingFullRefund] = useState(false);
   
   const requestRefund = useRequestRefundItem();
   const cancelRefund = useCancelRefundRequestItem();
   const respondRefund = useRespondRefundRequest();
   const [unrejectingItemId, setUnrejectingItemId] = useState<string | null>(null);

   const order = optimisticOrder;
   const isOwner = user?.id === order?.user_id;

   // Derive a normalized order state used for action visibility
   const orderStateForActions =
      order?.status === "refunded"
         ? "refunded"
         : String(order?.refund_status || order?.status || "").toString();

   // Determine if there are any actionable items for the Order Actions card
   const hasOrderActions = (() => {
      if (!order) return false;

      // Admin actions: allow status updates
      if (isAdmin) {
         if (
            orderStateForActions === "pending" ||
            orderStateForActions === "processing" ||
            orderStateForActions === "shipped"
         )
            return true;
      }

      // Owner actions: show unless refunded or refund window expired
      if (isOwner) {
         // Hide actions if order is refunded
         if (orderStateForActions === "refunded") return false;

         // If delivered, check refund window (24h)
         if (orderStateForActions === "delivered") {
            if (order.delivered_at) {
               const deliveredAt = new Date(order.delivered_at).getTime();
               const now = Date.now();
               const within24h = now - deliveredAt <= 24 * 60 * 60 * 1000;

               // Show actions if still within 24h or there is an active refund status
               if (within24h) return true;
               if (
                  order.refund_status &&
                  String(order.refund_status) !== "refunded"
               )
                  return true;

               // delivered and refund window expired with no refund -> hide
               return false;
            }

            // delivered but no delivered_at timestamp -> show actions conservatively
            return true;
         }

         // For non-delivered statuses (pending, processing, shipped, etc.) show actions
         return true;
      }

      return false;
   })();

   const requestOrderRefund = useRequestRefundOrder();
   const cancelOrderRefund = useCancelRefundRequestOrder();

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

   const buildTimeline = () => {
      const entries: {
         key: string;
         title: string;
         date?: string | null;
         color?: string;
         icon?: any;
      }[] = [];

      entries.push({
         key: "placed",
         title: "Order Placed",
         date: order.created_at,
         color: "bg-gray-400",
         icon: <Calendar className="h-4 w-4 text-white" />,
      });

      if (
         order.status === "processing" ||
         order.status === "shipped" ||
         order.status === "delivered"
      ) {
         entries.push({
            key: "processing",
            title: "Order Processing",
            date: (order as any).processed_at || order.updated_at,
            color: "bg-blue-500",
            icon: <Package className="h-4 w-4 text-white" />,
         });
      }

      if (order.status === "shipped" || order.status === "delivered") {
         entries.push({
            key: "shipped",
            title: "Order Shipped",
            date: order.shipped_at,
            color: "bg-purple-500",
            icon: <Truck className="h-4 w-4 text-white" />,
         });
      }

      if (order.status === "delivered") {
         entries.push({
            key: "delivered",
            title: "Order Delivered",
            date: order.delivered_at,
            color: "bg-green-500",
            icon: <CheckCircle className="h-4 w-4 text-white" />,
         });
      }

      if (order.status === "cancelled") {
         entries.push({
            key: "cancelled",
            title: "Order Cancelled",
            date: (order as any).cancelled_at || order.updated_at,
            color: "bg-red-500",
            icon: <X className="h-4 w-4 text-white" />,
         });
      }

      return entries.filter((e) => (e.date ? true : e.key === "placed"));
   };

   const handleStatusUpdate = async (newStatus: string) => {
      if (isUpdatingStatus) return;

      setIsUpdatingStatus(true);
      
      // Optimistically update the UI
      setOptimisticOrder({ ...order, status: newStatus as any });
      
      try {
         await updateOrderStatus.mutateAsync({
            id: order.id,
            status: newStatus as any,
         });
         toast.success(`Order status updated to ${newStatus}`);
         
         // Refresh the page to get updated data
         router.refresh();
      } catch (error) {
         console.error("Failed to update order status:", error);
         toast.error("Failed to update order status");
         
         // Revert optimistic update on error
         setOptimisticOrder(order);
      } finally {
         setIsUpdatingStatus(false);
      }
   };

   const handleContactSupport = () => {
      router.push("/contact");
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

   // Show loading state if order is not available
   if (!order) {
      return (
         <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
            <div className="flex items-center justify-center py-12">
               <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
               <span className="ml-2 text-sm sm:text-base">
                  Loading order details...
               </span>
            </div>
         </div>
      );
   }

   return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
         <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center space-x-3 sm:space-x-4">
               <Button
                  variant="ghost"
                  onClick={() => router.back()}
                  className="p-1 sm:p-2 hover:bg-gray-100 h-8 w-8 sm:h-10 sm:w-10"
               >
                  <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
               </Button>
               <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold break-words">
                     Order #{order.order_number}
                  </h1>
                  <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                     Placed on {formatDate(order.created_at)}
                  </p>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:w-auto">
               <Badge
                  className={`${getStatusColor(
                     order.status
                  )} text-white font-medium px-3 py-1`}
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
                  onClick={handleContactSupport}
                  className="border-green-300 text-green-600 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9 whitespace-nowrap"
               >
                  <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Contact Support
               </Button>
            </div>
         </div>

         <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <CardTitle className="flex items-center text-orange-800 text-lg sm:text-xl">
                        <Package className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Order Items
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                     {order.items && order.items.length > 0 ? (
                        <div className="space-y-4">
                           {order.items.map((item) => (
                              <div
                                 key={item.id}
                                 className="flex flex-col lg:flex-row justify-between items-start p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                 <div className="flex-1 w-full lg:w-auto mb-3 lg:mb-0">
                                    <h4 className="font-semibold text-sm sm:text-base break-words">
                                       {item.product_name}
                                    </h4>
                                    {item.variation_name && (
                                       <p className="text-xs sm:text-sm text-muted-foreground">
                                          Variation: {item.variation_name}
                                       </p>
                                    )}
                                    {item.product_sku && (
                                       <p className="text-xs sm:text-sm text-muted-foreground">
                                          SKU: {item.product_sku}
                                       </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs sm:text-sm">
                                       <span className="bg-gray-100 px-2 py-1 rounded">
                                          Qty: {item.quantity}
                                       </span>
                                       <span className="bg-gray-100 px-2 py-1 rounded">
                                          Unit: {item.price.toLocaleString()}{" "}
                                          RWF
                                       </span>
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-start lg:items-end gap-2 w-full lg:w-auto">
                                    <p className="font-semibold text-sm sm:text-base">
                                       {item.total.toLocaleString()} RWF
                                    </p>

                                    <div className="flex flex-wrap items-center gap-2">
                                       {/* Hide all actions if order or item is rejected, refunded, cancelled, or delivered */}
                                       {[
                                          "refunded",
                                          "cancelled",
                                          "delivered",
                                          "rejected",
                                       ].includes(orderStateForActions) ||
                                       item.refund_status === "rejected" ? (
                                          // Only show status badge
                                          item.refund_status === "rejected" ? (
                                             <Badge
                                                variant="destructive"
                                                className="text-xs"
                                             >
                                                <X className="h-3 w-3 mr-1" />
                                                Rejected
                                             </Badge>
                                          ) : item.refund_status ===
                                            "refunded" ? (
                                             <Badge
                                                variant="default"
                                                className="text-xs bg-green-100 text-green-700"
                                             >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Refunded
                                             </Badge>
                                          ) : item.refund_status ===
                                            "approved" ? (
                                             <Badge
                                                variant="default"
                                                className="text-xs"
                                             >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Refund Approved
                                             </Badge>
                                          ) : item.refund_status ===
                                            "requested" ? (
                                             <Badge
                                                variant="secondary"
                                                className="text-xs"
                                             >
                                                Requested
                                             </Badge>
                                          ) : item.refund_status ===
                                            "cancelled" ? (
                                             <Badge
                                                variant="secondary"
                                                className="text-xs"
                                             >
                                                Cancelled
                                             </Badge>
                                          ) : null
                                       ) : !isAdmin && isOwner ? (
                                          item.refund_status ? (
                                             <>
                                                <Badge
                                                   variant={(() => {
                                                      const status =
                                                         item.refund_status as import("@/types/orders").RefundStatus;
                                                      switch (status) {
                                                         case "approved":
                                                            return "default";
                                                         case "rejected":
                                                            return "destructive";
                                                         case "requested":
                                                         case "cancelled":
                                                            return "secondary";
                                                         case "refunded":
                                                            return "default";
                                                         default:
                                                            return "secondary";
                                                      }
                                                   })()}
                                                   className="text-xs"
                                                >
                                                   {item.refund_status ===
                                                   "approved" ? (
                                                      <>
                                                         <CheckCircle className="h-3 w-3 mr-1" />
                                                         Refund Approved
                                                      </>
                                                   ) : typeof item.refund_status ===
                                                     "string" ? (
                                                      item.refund_status
                                                         .charAt(0)
                                                         .toUpperCase() +
                                                      item.refund_status.slice(
                                                         1
                                                      )
                                                   ) : (
                                                      "Unknown"
                                                   )}
                                                </Badge>
                                                {item.refund_status ===
                                                   "requested" && (
                                                   <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      onClick={async () => {
                                                         setUnrejectingItemId(
                                                            item.id
                                                         );
                                                         try {
                                                            await cancelRefund.mutateAsync(
                                                               item.id
                                                            );
                                                         } catch (e) {
                                                            // handled by mutation
                                                         } finally {
                                                            setUnrejectingItemId(
                                                               null
                                                            );
                                                         }
                                                      }}
                                                      disabled={
                                                         unrejectingItemId ===
                                                         item.id
                                                      }
                                                      className="text-xs h-7"
                                                   >
                                                      {unrejectingItemId ===
                                                      item.id ? (
                                                         <Loader2 className="h-3 w-3 animate-spin" />
                                                      ) : (
                                                         "Cancel"
                                                      )}
                                                   </Button>
                                                )}
                                             </>
                                          ) : (
                                             <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                   setRejectingItemId(item.id);
                                                   setRejectDialogOpen(true);
                                                }}
                                                className={`text-xs h-7 ${
                                                   order.status === "delivered"
                                                      ? "border-green-300 text-green-600 hover:bg-green-50"
                                                      : "border-red-300 text-red-600 hover:bg-red-50"
                                                }`}
                                             >
                                                {order.status === "delivered"
                                                   ? "Request Refund"
                                                   : "Reject"}
                                             </Button>
                                          )
                                       ) : null}
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="text-center py-8">
                           <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                           <p className="text-muted-foreground">
                              No items found for this order.
                           </p>
                        </div>
                     )}
                  </CardContent>
               </Card>

               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <CardTitle className="text-orange-800 text-lg sm:text-xl">
                        Order Timeline
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                     {buildTimeline().length > 0 ? (
                        <div className="space-y-4">
                           {buildTimeline().map((entry, index) => (
                              <div
                                 key={entry.key}
                                 className="flex items-start space-x-4"
                              >
                                 <div className="flex-shrink-0 relative">
                                    <div
                                       className={`w-8 h-8 ${
                                          entry.color || "bg-gray-400"
                                       } rounded-full flex items-center justify-center shadow-sm`}
                                    >
                                       {entry.icon}
                                    </div>
                                    {index < buildTimeline().length - 1 && (
                                       <div className="absolute top-8 left-4 w-px h-6 bg-gray-300" />
                                    )}
                                 </div>
                                 <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-sm sm:text-base">
                                       {entry.title}
                                    </p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                       {entry.date
                                          ? formatDate(entry.date)
                                          : "Date not available"}
                                    </p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="text-center py-8">
                           <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                           <p className="text-muted-foreground">
                              No timeline data available for this order.
                           </p>
                        </div>
                     )}
                  </CardContent>
               </Card>
            </div>

            <div className="space-y-6">
               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <CardTitle className="text-orange-800 text-lg sm:text-xl">
                        Order Summary
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-3">
                     <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{order.subtotal.toLocaleString()} RWF</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span>Tax/Transport</span>
                        <span>{(order.tax || 0).toLocaleString()} RWF</span>
                     </div>
                     <Separator />
                     <div className="flex justify-between font-bold text-base sm:text-lg">
                        <span>Total</span>
                        <span>{order.total.toLocaleString()} RWF</span>
                     </div>
                  </CardContent>
               </Card>

               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <CardTitle className="text-orange-800 text-lg sm:text-xl">
                        Customer Information
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-3">
                     <div className="flex items-center space-x-3">
                        <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm break-words">
                           {order.customer_first_name}{" "}
                           {order.customer_last_name}
                        </span>
                     </div>
                     <div className="flex items-center space-x-3">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm break-words">
                           {order.customer_email}
                        </span>
                     </div>
                     {order.customer_phone && (
                        <div className="flex items-center space-x-3">
                           <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                           <span className="text-sm break-words">
                              {order.customer_phone}
                           </span>
                        </div>
                     )}
                  </CardContent>
               </Card>

               <Card className="border-orange-200">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                     <CardTitle className="text-orange-800 text-lg sm:text-xl">
                        Delivery Information
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 space-y-3">
                     <div className="flex items-start space-x-3">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                           <p className="text-sm break-words">
                              {order.delivery_address}
                           </p>
                           <p className="text-muted-foreground text-sm break-words">
                              {order.delivery_city}
                           </p>
                        </div>
                     </div>
                     {order.delivery_notes && (
                        <div className="pt-2 border-t">
                           <p className="text-sm font-semibold mb-1">
                              Delivery Notes:
                           </p>
                           <p className="text-sm text-muted-foreground break-words">
                              {order.delivery_notes}
                           </p>
                        </div>
                     )}
                  </CardContent>
               </Card>

               {/* Payment Information */}
               <PaymentInfoCard orderId={order.id} />

               {(isAdmin || isOwner) && hasOrderActions && (
                  <Card className="border-orange-200">
                     <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-25 py-4 sm:py-5">
                        <CardTitle className="text-orange-800 text-lg sm:text-xl">
                           Order Actions
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="p-4 sm:p-6">
                        <div className="space-y-3">
                           <div className="grid grid-cols-1 gap-2">
                              {isAdmin && order.status === "pending" && (
                                 <Button
                                    size="sm"
                                    onClick={() =>
                                       handleStatusUpdate("processing")
                                    }
                                    disabled={isUpdatingStatus}
                                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm h-8 sm:h-9"
                                 >
                                    {isUpdatingStatus ? (
                                       <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
                                    ) : (
                                       <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                    )}
                                    Mark Processing
                                 </Button>
                              )}

                              {isAdmin && order.status === "processing" && (
                                 <Button
                                    size="sm"
                                    onClick={() =>
                                       handleStatusUpdate("shipped")
                                    }
                                    disabled={isUpdatingStatus}
                                    className="bg-purple-500 hover:bg-purple-600 text-white text-xs sm:text-sm h-8 sm:h-9"
                                 >
                                    {isUpdatingStatus ? (
                                       <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
                                    ) : (
                                       <Truck className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                    )}
                                    Mark Shipped
                                 </Button>
                              )}

                              {isAdmin && order.status === "shipped" && (
                                 <Button
                                    size="sm"
                                    onClick={() =>
                                       handleStatusUpdate("delivered")
                                    }
                                    disabled={isUpdatingStatus}
                                    className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm h-8 sm:h-9"
                                 >
                                    {isUpdatingStatus ? (
                                       <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2" />
                                    ) : (
                                       <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                    )}
                                    Mark Delivered
                                 </Button>
                              )}

                              {order.status &&
                                 ["pending", "processing"].includes(
                                    order.status
                                 ) && (
                                    <AlertDialog
                                       open={showCancelConfirm}
                                       onOpenChange={setShowCancelConfirm}
                                    >
                                       <AlertDialogTrigger asChild>
                                          <Button
                                             size="sm"
                                             variant="outline"
                                             className="border-red-300 text-red-600 hover:bg-red-50 text-xs sm:text-sm h-8 sm:h-9"
                                             disabled={isUpdatingStatus}
                                          >
                                             <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                             Cancel Order
                                          </Button>
                                       </AlertDialogTrigger>

                                       <AlertDialogContent className="max-w-md">
                                          <AlertDialogHeader>
                                             <AlertDialogTitle>
                                                Confirm Cancel Order
                                             </AlertDialogTitle>
                                             <AlertDialogDescription>
                                                Cancelling this order will set
                                                its status to
                                                &quot;cancelled&quot;. This
                                                action cannot be undone. Are you
                                                sure you want to proceed?
                                             </AlertDialogDescription>
                                          </AlertDialogHeader>

                                          <div className="mt-2 px-1">
                                             <label className="flex items-center gap-2 text-sm">
                                                <Checkbox
                                                   checked={redirectAfterCancel}
                                                   onCheckedChange={(v) =>
                                                      setRedirectAfterCancel(
                                                         !!v
                                                      )
                                                   }
                                                />
                                                Redirect to home after
                                                cancelling
                                             </label>
                                          </div>

                                          <AlertDialogFooter>
                                             <AlertDialogCancel>
                                                Close
                                             </AlertDialogCancel>
                                             <AlertDialogAction
                                                onClick={async () => {
                                                   setShowCancelConfirm(false);
                                                   if (isUpdatingStatus) return;
                                                   setIsUpdatingStatus(true);
                                                   try {
                                                      await handleStatusUpdate(
                                                         "cancelled"
                                                      );
                                                      toast.success(
                                                         "Order cancelled"
                                                      );
                                                      if (redirectAfterCancel) {
                                                         router.push("/");
                                                      }
                                                   } catch (err) {
                                                      console.error(err);
                                                      toast.error(
                                                         "Failed to cancel order"
                                                      );
                                                   } finally {
                                                      setIsUpdatingStatus(
                                                         false
                                                      );
                                                   }
                                                }}
                                                className="bg-red-600 hover:bg-red-700 text-white"
                                             >
                                                Confirm Cancel
                                             </AlertDialogAction>
                                          </AlertDialogFooter>
                                       </AlertDialogContent>
                                    </AlertDialog>
                                 )}
                           </div>

                           {order.status === "delivered" &&
                              order.delivered_at &&
                              (() => {
                                 const deliveredAt = new Date(
                                    order.delivered_at
                                 ).getTime();
                                 const now = Date.now();
                                 const within24h =
                                    now - deliveredAt <= 24 * 60 * 60 * 1000;
                                 const refundNotRequested =
                                    order.refund_status !== "requested";

                                 if (within24h && refundNotRequested) {
                                    return (
                                       <div className="pt-2 border-t">
                                          <Button
                                             size="sm"
                                             variant="outline"
                                             onClick={() =>
                                                setFullRefundDialogOpen(true)
                                             }
                                             className="border-green-300 text-green-600 hover:bg-green-50 text-xs sm:text-sm h-8 sm:h-9 w-full"
                                          >
                                             <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                             Request Full Refund
                                          </Button>
                                       </div>
                                    );
                                 }

                                 // Show approved message if refund is approved
                                 if (
                                    order.refund_status === "approved" &&
                                    isOwner
                                 ) {
                                    return (
                                       <div className="pt-2 border-t">
                                          <div className="flex items-center justify-center p-3 bg-green-50 border border-green-200 rounded-lg">
                                             <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                             <span className="text-green-700 font-medium text-sm">
                                                Refund Approved - Processing
                                                within 24 hours
                                             </span>
                                          </div>
                                       </div>
                                    );
                                 }

                                 // Show rejected message if refund is rejected
                                 if (
                                    order.refund_status === "rejected" &&
                                    isOwner
                                 ) {
                                    return (
                                       <div className="pt-2 border-t">
                                          <div className="flex items-center justify-center p-3 bg-red-50 border border-red-200 rounded-lg">
                                             <X className="h-4 w-4 text-red-600 mr-2" />
                                             <span className="text-red-700 font-medium text-sm">
                                                Refund Request Rejected
                                             </span>
                                          </div>
                                       </div>
                                    );
                                 }

                                 if (!refundNotRequested && isOwner) {
                                    return (
                                       <div className="pt-2 border-t">
                                          <Button
                                             size="sm"
                                             variant="outline"
                                             onClick={async () => {
                                                try {
                                                   await cancelOrderRefund.mutateAsync(
                                                      order.id
                                                   );
                                                   toast.success(
                                                      "Refund request cancelled"
                                                   );
                                                } catch (e) {
                                                   // handled by mutation
                                                }
                                             }}
                                             className="border-yellow-300 text-yellow-600 hover:bg-yellow-50 text-xs sm:text-sm h-8 sm:h-9 w-full"
                                          >
                                             <X className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                             Cancel Refund Request
                                          </Button>
                                       </div>
                                    );
                                 }

                                 return null;
                              })()}
                        </div>
                     </CardContent>
                  </Card>
               )}
            </div>
         </div>

         {/* Full Order Refund Dialog */}
         <Dialog
            open={fullRefundDialogOpen}
            onOpenChange={(v: boolean) => setFullRefundDialogOpen(v)}
         >
            <DialogContent className="max-w-md">
               <DialogHeader>
                  <DialogTitle>Request Full Order Refund</DialogTitle>
                  <DialogDescription>
                     Provide a reason for requesting a refund for this entire
                     order. The admin will review your request.
                  </DialogDescription>
               </DialogHeader>

               <div className="mt-2">
                  <Textarea
                     value={fullRefundReason}
                     onChange={(e) => setFullRefundReason(e.target.value)}
                     placeholder="Enter refund reason"
                     className="w-full border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-sm"
                  />
               </div>

               <DialogFooter>
                  <div className="flex justify-end space-x-2 w-full">
                     <Button
                        variant="outline"
                        onClick={() => {
                           setFullRefundDialogOpen(false);
                           setFullRefundReason("");
                        }}
                        disabled={isRequestingFullRefund}
                        className="flex-1"
                     >
                        Cancel
                     </Button>
                     <Button
                        onClick={async () => {
                           if (!fullRefundReason.trim()) return;
                           setIsRequestingFullRefund(true);
                           try {
                              await requestOrderRefund.mutateAsync({
                                 orderId: order.id,
                                 reason: fullRefundReason,
                              });
                              toast.success("Full order refund requested");
                              setFullRefundDialogOpen(false);
                              setFullRefundReason("");
                           } catch (err) {
                              // mutation handles toast on error
                           } finally {
                              setIsRequestingFullRefund(false);
                           }
                        }}
                        disabled={
                           isRequestingFullRefund || !fullRefundReason.trim()
                        }
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                     >
                        {isRequestingFullRefund ? (
                           <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {isRequestingFullRefund
                           ? "Requesting..."
                           : "Request Refund"}
                     </Button>
                  </div>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <Dialog
            open={rejectDialogOpen}
            onOpenChange={(v: boolean) => setRejectDialogOpen(v)}
         >
            <DialogContent className="max-w-md">
               <DialogHeader>
                  <DialogTitle>
                     {order?.status === "delivered"
                        ? "Request Refund"
                        : "Request Reject"}
                  </DialogTitle>
                  <DialogDescription>
                     {order?.status === "delivered"
                        ? "Provide a reason for requesting a refund for this item. The admin will review your request."
                        : "Provide a reason for rejecting this item. The admin will review your request."}
                  </DialogDescription>
               </DialogHeader>

               <div className="mt-2">
                  <Textarea
                     value={rejectReason}
                     onChange={(e) => setRejectReason(e.target.value)}
                     placeholder={
                        order?.status === "delivered"
                           ? "Enter refund reason"
                           : "Enter rejection reason"
                     }
                     className="w-full border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-sm"
                  />
               </div>

               <DialogFooter>
                  <div className="flex justify-end space-x-2 w-full">
                     <Button
                        variant="outline"
                        onClick={() => {
                           setRejectDialogOpen(false);
                           setRejectReason("");
                           setRejectingItemId(null);
                        }}
                        disabled={isRejecting}
                        className="flex-1"
                     >
                        Cancel
                     </Button>
                     <Button
                        onClick={async () => {
                           if (!rejectingItemId) return;
                           setIsRejecting(true);
                           try {
                              await requestRefund.mutateAsync({
                                 orderItemId: rejectingItemId,
                                 reason: rejectReason,
                              });
                              toast.success(
                                 order?.status === "delivered"
                                    ? "Refund requested"
                                    : "Reject requested"
                              );
                              setRejectDialogOpen(false);
                              setRejectReason("");
                              setRejectingItemId(null);
                           } catch (e) {
                              // mutation handles toast on error
                           } finally {
                              setIsRejecting(false);
                           }
                        }}
                        disabled={isRejecting || !rejectReason}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                     >
                        {isRejecting ? (
                           <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {isRejecting
                           ? order?.status === "delivered"
                              ? "Requesting..."
                              : "Requesting..."
                           : order?.status === "delivered"
                           ? "Request Refund"
                           : "Request Reject"}
                     </Button>
                  </div>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
};

export default OrderClientPage;
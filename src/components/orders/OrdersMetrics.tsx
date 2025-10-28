"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
   MoreHorizontal,
   PlusCircle,
   TrendingUp,
   TrendingDown,
   Loader2,
} from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { Order } from "@/types/orders";
import Link from "next/link";
import { useEffect, useState } from "react";

interface OrderMetric {
   title: string;
   value: string;
   change: string;
   isPositive: boolean;
   period: string;
}

export default function OrdersMetrics() {
   const { useAllOrders } = useOrders();
   const {
      data: allOrdersResponse,
      isLoading,
      isError,
      error,
      refetch,
   } = useAllOrders();

   // Calculate metrics from actual orders data
   const getOrderMetrics = (): OrderMetric[] => {
      // Extract the orders array from the response object
      const orders: Order[] = allOrdersResponse?.data || [];

      if (orders.length === 0) {
         return [
            {
               title: "Total Orders",
               value: "0",
               change: "0%",
               isPositive: true,
               period: "Last 7 days",
            },
            {
               title: "New Orders",
               value: "0",
               change: "0%",
               isPositive: true,
               period: "Last 7 days",
            },
            {
               title: "Completed Orders",
               value: "0",
               change: "0%",
               isPositive: true,
               period: "Last 7 days",
            },
            {
               title: "Canceled Orders",
               value: "0",
               change: "0%",
               isPositive: false,
               period: "Last 7 days",
            },
         ];
      }

      // Calculate totals by status
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(
         (order) => order.status === "pending"
      ).length;
      const processingOrders = orders.filter(
         (order) => order.status === "processing"
      ).length;
      const deliveredOrders = orders.filter(
         (order) => order.status === "delivered"
      ).length;
      const cancelledOrders = orders.filter(
         (order) => order.status === "cancelled"
      ).length;
      const shippedOrders = orders.filter(
         (order) => order.status === "shipped"
      ).length;

      // Calculate completion rate (delivered + shipped orders)
      const completedOrders = deliveredOrders + shippedOrders;
      const completionRate =
         totalOrders > 0
            ? Math.round((completedOrders / totalOrders) * 100)
            : 0;

      // Calculate cancellation rate
      const cancellationRate =
         totalOrders > 0
            ? Math.round((cancelledOrders / totalOrders) * 100)
            : 0;

      // Calculate some mock growth rates (you can replace this with actual calculation)
      const totalGrowth =
         Math.random() > 0.5 ? Math.random() * 20 + 5 : -(Math.random() * 10);
      const pendingGrowth =
         Math.random() > 0.5 ? Math.random() * 25 + 10 : -(Math.random() * 15);

      return [
         {
            title: "Total Orders",
            value: totalOrders.toLocaleString(),
            change: `${totalGrowth > 0 ? "+" : ""}${totalGrowth.toFixed(1)}%`,
            isPositive: totalGrowth > 0,
            period: "Last 7 days",
         },
         {
            title: "New Orders",
            value: (pendingOrders + processingOrders).toLocaleString(),
            change: `${pendingGrowth > 0 ? "+" : ""}${pendingGrowth.toFixed(
               1
            )}%`,
            isPositive: pendingGrowth > 0,
            period: "Last 7 days",
         },
         {
            title: "Completed Orders",
            value: completedOrders.toLocaleString(),
            change: `${completionRate}%`,
            isPositive: true,
            period: "Completion Rate",
         },
         {
            title: "Canceled Orders",
            value: cancelledOrders.toLocaleString(),
            change: `${cancellationRate}%`,
            isPositive: false,
            period: "Cancellation Rate",
         },
      ];
   };

   const orderMetrics = getOrderMetrics();

   // Orders enabled toggle
   const [ordersEnabled, setOrdersEnabled] = useState<boolean | null>(null);
   const [toggling, setToggling] = useState(false);
   const [ordersDisabledMessage, setOrdersDisabledMessage] = useState<
      string | null
   >(null);
   const [ordersScheduleDisabled, setOrdersScheduleDisabled] = useState<
      boolean | null
   >(null);
   const { t } = useLanguage();
   // Customer-friendly localized fallback message. Prefer localized keys
   const CUSTOMER_FALLBACK_MSG =
      t("checkout.ordersDisabledBanner") ||
      t("checkout.ordersDisabledMessage") ||
      "We are currently not allowing orders, please try again later";

   const fetchOrdersEnabled = async () => {
      try {
         const res = await fetch("/api/admin/settings/orders-enabled");
         if (!res.ok) throw new Error("Failed to fetch setting");
         const json = await res.json();
         setOrdersEnabled(Boolean(json.enabled));
         // If server returned nextToggleAt, schedule a refetch at that time so UI updates automatically
         if (json.nextToggleAt) {
            try {
               const next = new Date(json.nextToggleAt).getTime();
               const now = Date.now();
               const delay = Math.max(0, next - now + 500); // small buffer
               setTimeout(
                  () => fetchOrdersEnabled(),
                  Math.min(delay, 24 * 60 * 60 * 1000)
               );
            } catch (e) {}
         }
      } catch (err) {
         console.warn("Failed to load orders_enabled setting", err);
         setOrdersEnabled(true);
      }
   };

   useEffect(() => {
      fetchOrdersEnabled();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   const toggleOrders = async (next: boolean) => {
      setToggling(true);
      try {
         const res = await fetch("/api/admin/settings/orders-enabled", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: next }),
         });
         if (!res.ok) throw new Error("Failed to update setting");
         const json = await res.json();
         setOrdersEnabled(Boolean(json.enabled));
         setOrdersDisabledMessage(json.message || null);
         setOrdersScheduleDisabled(
            typeof json.scheduleDisabled !== "undefined"
               ? Boolean(json.scheduleDisabled)
               : null
         );
      } catch (err) {
         console.error("Failed to toggle orders setting", err);
      } finally {
         setToggling(false);
      }
   };

   if (isError) {
      return (
         <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-7 sm:gap-2">
               <div className="flex flex-col">
                  <h1 className="text-2xl font-bold text-[#023337]">
                     Order List
                  </h1>
                  <p className="text-zinc-500 sm:hidden">
                     Track orders list across your store.
                  </p>
               </div>
               <div className="flex items-center gap-3">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                     <PlusCircle className="h-4 w-4" />
                     Add Order
                  </Button>
                  <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                           More Action
                           <MoreHorizontal className="h-4 w-4 ml-2" />
                        </Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
                        <DropdownMenuItem>Export Orders</DropdownMenuItem>
                        <DropdownMenuItem>Import Orders</DropdownMenuItem>
                        <DropdownMenuItem>Settings</DropdownMenuItem>
                     </DropdownMenuContent>
                  </DropdownMenu>
               </div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
               <p className="text-red-600">
                  Error loading order metrics: {error?.message}
               </p>
            </div>
         </div>
      );
   }

   return (
      <div className="space-y-6">
         {/* Show banner when orders are disabled */}
         {ordersEnabled === false && (
            <div className="p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
               {ordersDisabledMessage
                  ? ordersDisabledMessage
                  : CUSTOMER_FALLBACK_MSG}
            </div>
         )}
         {/* Header */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-7 sm:gap-2">
            <div className="flex flex-col">
               <h1 className="text-2xl font-bold text-[#023337]">Order List</h1>
               <p className="text-zinc-500 sm:hidden">
                  Track orders list across your store.
               </p>
            </div>
            <div className="flex items-center gap-3">
               <Link href="/admin/orders/add">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                     <PlusCircle className="h-4 w-4 mr-2" />
                     Add Order
                  </Button>
               </Link>
               <Link href="/admin/orders/external">
                  <Button variant="outline">External Orders</Button>
               </Link>
               {/* Orders enable/disable toggle */}
               <Button
                  variant={ordersEnabled ? "destructive" : "ghost"}
                  onClick={() => toggleOrders(!Boolean(ordersEnabled))}
                  disabled={toggling || ordersEnabled === null}
                  className={
                     ordersEnabled === false
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : undefined
                  }
               >
                  {toggling ? (
                     <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : ordersEnabled ? (
                     "Disable Orders"
                  ) : (
                     "Enable Orders"
                  )}
               </Button>
            </div>
         </div>

         {/* Metrics Cards */}
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {isLoading
               ? // Loading skeleton
                 Array.from({ length: 4 }).map((_, index) => (
                    <Card
                       key={index}
                       className="relative"
                    >
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
                          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                       </CardHeader>
                       <CardContent>
                          <div className="space-y-2">
                             <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                             <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                             <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                          </div>
                       </CardContent>
                    </Card>
                 ))
               : orderMetrics.map((metric, index) => (
                    <Card
                       key={index}
                       className="relative"
                    >
                       <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <h3 className="text-lg text-[#23272E] font-semibold">
                             {metric.title}
                          </h3>
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
                                   onClick={() => refetch && refetch()}
                                >
                                   Refresh
                                </DropdownMenuItem>
                             </DropdownMenuContent>
                          </DropdownMenu>
                       </CardHeader>
                       <CardContent>
                          <div className="space-y-2 flex items-end gap-2">
                             <div className="text-3xl font-bold text-[#023337]">
                                {metric.value}
                             </div>
                             <div className="flex items-center gap-2 text-sm">
                                <div
                                   className={`flex items-center gap-1 ${
                                      metric.isPositive
                                         ? "text-green-600"
                                         : "text-red-600"
                                   }`}
                                >
                                   {metric.isPositive ? (
                                      <TrendingUp className="h-3 w-3" />
                                   ) : (
                                      <TrendingDown className="h-3 w-3" />
                                   )}
                                   <span>
                                      {metric.isPositive ? "↑" : "↓"}{" "}
                                      {metric.change}
                                   </span>
                                </div>
                             </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                             {metric.period}
                          </div>
                       </CardContent>
                    </Card>
                 ))}
         </div>
      </div>
   );
}

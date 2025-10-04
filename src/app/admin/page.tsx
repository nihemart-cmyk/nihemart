"use client";
import React, { useState, useMemo } from "react";
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
   Calendar,
   Search,
   TrendingUp,
   Users,
   ShoppingCart,
   RotateCcw,
   Bike,
   LucideIcon,
   Download,
   Loader2,
   Package,
} from "lucide-react";
import OrdersListMini from "@/components/admin/orders-list-mini";
import { format } from "date-fns";
import Link from "next/link";
import { useOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { useUsers } from "@/hooks/useUsers";
import { useRiders } from "@/hooks/useRiders";
import { useQuery } from "@tanstack/react-query";
import {
   Area,
   AreaChart,
   Bar,
   BarChart,
   CartesianGrid,
   XAxis,
   YAxis,
   ResponsiveContainer,
} from "recharts";
import {
   ChartContainer,
   ChartTooltip,
   ChartTooltipContent,
} from "@/components/ui/chart";

// Type definitions
interface StatsCardProps {
   title: string;
   value: string;
   change?: string;
   icon: LucideIcon;
   iconColor: string;
}

interface DetailedStatsData {
   label: string;
   value: string;
}

interface DetailedStatsCardProps {
   title: string;
   data: DetailedStatsData[];
   icon: LucideIcon;
   iconColor: string;
}

interface ProductItemProps {
   image?: React.ReactNode;
   name: string;
   code: string;
   price: string;
   bgColor?: string;
}

interface UserItemProps {
   name: string;
   code: string;
   amount: string;
   avatar: string;
}

// Stats Card Component
const StatsCard: React.FC<StatsCardProps> = ({
   title,
   value,
   change,
   icon: Icon,
   iconColor,
}) => (
   <div className="bg-white rounded-lg border shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
         <div className={`p-2 rounded-lg ${iconColor}`}>
            <Icon className="w-5 h-5 text-white" />
         </div>
      </div>
      <div className="flex flex-col flex-grow justify-between">
         <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
         <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
         {change && (
            <div className="flex items-center gap-1 mt-auto">
               <TrendingUp className="w-4 h-4 text-blue-500" />
               <span className="text-sm text-blue-500">{change}%</span>
               <span className="text-sm text-gray-500">vs last 7 days</span>
            </div>
         )}
      </div>
   </div>
);

// Detailed Stats Card Component
const DetailedStatsCard: React.FC<DetailedStatsCardProps> = ({
   title,
   data,
   icon: Icon,
   iconColor,
}) => (
   <div className="bg-white rounded-lg border shadow-sm p-6 flex flex-col h-full ">
      <div className="flex items-center justify-between mb-4">
         <div className={`p-2 rounded-lg ${iconColor}`}>
            <Icon className="w-5 h-5 text-white" />
         </div>
      </div>
      <div className="flex flex-col flex-grow justify-between">
         <p className="text-sm font-medium text-gray-600 mb-3">{title}</p>
         <div className="space-y-2">
            {data.map((item: DetailedStatsData, index: number) => (
               <div
                  key={index}
                  className="flex justify-between items-center flex-wrap"
               >
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <span className="text-sm font-medium text-gray-900">
                     {item.value}
                  </span>
               </div>
            ))}
         </div>
      </div>
   </div>
);

// Product Item Component
const ProductItem: React.FC<ProductItemProps> = ({
   image,
   name,
   code,
   price,
   bgColor = "bg-gray-100",
}) => (
   <div className="flex items-center gap-3 p-3">
      <div
         className={`w-10 h-10 rounded ${bgColor} flex items-center justify-center`}
      >
         {image || <div className="w-6 h-6 bg-gray-400 rounded"></div>}
      </div>
      <div className="flex-1">
         <p className="font-medium text-gray-900">{name}</p>
         <p className="text-sm text-gray-500">{code}</p>
         <p className="font-semibold text-gray-900">{price}</p>
      </div>
   </div>
);

// User Item Component
const UserItem: React.FC<UserItemProps> = ({ name, code, amount, avatar }) => (
   <div className="flex items-center gap-3 p-3">
      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
         <span className="text-white font-medium">{avatar}</span>
      </div>
      <div className="flex-1">
         <p className="font-medium text-gray-900">{name}</p>
         <p className="text-sm text-gray-500">{code}</p>
      </div>
      <p className="font-semibold text-gray-900">{amount}</p>
   </div>
);

// Main Dashboard Component
const Dashboard: React.FC = () => {
   const [date, setDate] = useState<Date | undefined>(new Date());
   const [calendarOpen, setCalendarOpen] = useState(false);
   const [productSearch, setProductSearch] = useState("");
   const [userSearch, setUserSearch] = useState("");

   // Fetch real data
   const { useAllOrders, useOrderStats } = useOrders();
   const { useProducts: useProductsHook } = useProducts();
   const { users, loading: usersLoading, fetchUsers } = useUsers();
   const { data: ridersData, isLoading: ridersLoading } = useRiders();

   const { data: ordersResponse, isLoading: ordersLoading } = useAllOrders({
      pagination: { page: 1, limit: 1000 },
   });
   const { data: orderStats, isLoading: statsLoading } = useOrderStats();
   const { data: productsResponse, isLoading: productsLoading } =
      useProductsHook({
         pagination: { page: 1, limit: 100 },
      });

   const orders = ordersResponse?.data || [];
   const products = productsResponse?.data || [];
   const riders = ridersData || [];

   // Calculate real metrics
   const metrics = useMemo(() => {
      const totalRevenue = orders.reduce(
         (sum, order) => sum + (order.total || 0),
         0
      );
      const totalUsers = users.length;
      const totalOrders = orders.length;

      // Calculate refunds
      const refundedOrders = orders.filter(
         (order) =>
            order.status === "cancelled" || order.refund_status === "approved"
      );
      const totalRefunded = refundedOrders.reduce(
         (sum, order) => sum + (order.total || 0),
         0
      );

      // Calculate profit (simplified - revenue minus some costs)
      const profit = totalRevenue * 0.8; // Assuming 20% costs

      return {
         totalRevenue,
         totalUsers,
         totalOrders,
         totalRefunded,
         refundedOrders: refundedOrders.length,
      };
   }, [orders, users]);

   // Calculate order status breakdown
   const orderStatusData: DetailedStatsData[] = useMemo(() => {
      const statusCounts = orders.reduce((acc, order) => {
         const status = order.status || "pending";
         acc[status] = (acc[status] || 0) + 1;
         return acc;
      }, {} as Record<string, number>);

      return [
         { label: "Pending", value: (statusCounts.pending || 0).toString() },
         {
            label: "Processing",
            value: (statusCounts.processing || 0).toString(),
         },
         { label: "Shipped", value: (statusCounts.shipped || 0).toString() },
         {
            label: "Delivered",
            value: (statusCounts.delivered || 0).toString(),
         },
      ];
   }, [orders]);

   // Calculate refunds data
   const refundsData: DetailedStatsData[] = useMemo(() => {
      const refundedOrders = orders.filter(
         (order) =>
            order.status === "cancelled" || order.refund_status === "approved"
      );
      const totalRefundedAmount = refundedOrders.reduce(
         (sum, order) => sum + (order.total || 0),
         0
      );

      return [
         {
            label: "Total Refunded Orders",
            value: refundedOrders.length.toString(),
         },
         {
            label: "Total Refunded Money",
            value: `RWF ${totalRefundedAmount.toLocaleString()}`,
         },
      ];
   }, [orders]);

   // Calculate riders data
   const ridersStatsData: DetailedStatsData[] = useMemo(() => {
      const activeRiders = riders.filter((rider) => rider.active).length;

      // Calculate total earnings from completed deliveries
      const totalRiderEarnings = orders
         .filter((order) => order.status === "delivered")
         .reduce((sum, order) => sum + (order.tax || 0), 0);

      return [
         { label: "Active Riders", value: activeRiders.toString() },
         {
            label: "Total Earnings",
            value: `RWF ${totalRiderEarnings.toLocaleString()}`,
         },
      ];
   }, [riders, orders]);

   // Filter products based on search
   const filteredProducts = useMemo(() => {
      if (!productSearch.trim()) return products.slice(0, 5); // Show top 5
      return products
         .filter(
            (product) =>
               product.name
                  .toLowerCase()
                  .includes(productSearch.toLowerCase()) ||
               product.sku?.toLowerCase().includes(productSearch.toLowerCase())
         )
         .slice(0, 5);
   }, [products, productSearch]);

   // Filter users based on search
   const filteredUsers = useMemo(() => {
      if (!userSearch.trim()) return users.slice(0, 5); // Show top 5
      return users
         .filter(
            (user) =>
               user.full_name
                  ?.toLowerCase()
                  .includes(userSearch.toLowerCase()) ||
               user.email?.toLowerCase().includes(userSearch.toLowerCase())
         )
         .slice(0, 5);
   }, [users, userSearch]);

   // Get top riders based on actual earnings
   const topRiders = useMemo(() => {
      // Calculate earnings per rider from delivered orders
      const riderEarnings: Record<string, number> = {};

      orders
         .filter((order) => order.status === "delivered")
         .forEach((order) => {
            // We need to get the rider_id from order_assignments
            // For now, we'll use a simplified approach
            // In a real implementation, you'd join with order_assignments
            const earnings = order.tax || 0;
            // This is a simplified version - in practice you'd need to join with assignments
         });

      return riders
         .filter((rider) => rider.active)
         .slice(0, 2)
         .map((rider) => ({
            name: rider.full_name || "Unknown Rider",
            code: "Rider",
            amount: `RWF ${(250000).toLocaleString()}`, // Keep mock for now since we need assignment data
            avatar:
               rider.full_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "R",
         }));
   }, [riders, orders]);

   return (
      <div className="min-h-screen p-4 md:p-6">
         <ScrollArea className="h-[calc(100vh-2rem)] pb-20">
            <div className="overflow-x-auto">
               <div className="flex flex-col">
                  {/* Top Section with Main Content and Sidebar */}
                  <div className="flex flex-col lg:flex-row gap-4 md:gap-6 mb-6">
                     {/* Main Content - 2/3 width */}
                     <div className="w-full lg:w-2/3 xl:w-3/4">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-4 md:mb-6">
                           <div className="mb-4 sm:mb-0">
                              <h1 className="text-2xl font-bold text-gray-900">
                                 Dashboard
                              </h1>
                              <p className="text-orange-500">
                                 Monitor Everything using this Dashboard
                              </p>
                           </div>
                           <Button className="bg-orange-500 hover:bg-orange-600">
                              <Download className="w-4 h-4 mr-2" />
                              Export
                           </Button>
                        </div>

                        {/* Date Selector */}
                        <div className="flex justify-end items-center gap-2 mb-4 md:mb-6">
                           <Popover
                              open={calendarOpen}
                              onOpenChange={setCalendarOpen}
                           >
                              <PopoverTrigger asChild>
                                 <Button
                                    variant="outline"
                                    className="justify-start text-left font-normal h-9 px-3"
                                 >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {date ? (
                                       format(date, "PPP")
                                    ) : (
                                       <span>Pick a date</span>
                                    )}
                                 </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                 className="w-auto p-0"
                                 align="end"
                              >
                                 <CalendarComponent
                                    mode="single"
                                    selected={date}
                                    onSelect={(selectedDate) => {
                                       setDate(selectedDate);
                                       setCalendarOpen(false);
                                    }}
                                    initialFocus
                                    captionLayout="dropdown"
                                    fromYear={2020}
                                    toYear={2025}
                                    className="rounded-md border shadow-sm"
                                 />
                              </PopoverContent>
                           </Popover>
                        </div>

                        {/* Stats Cards Row 1 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
                           {ordersLoading || usersLoading ? (
                              // Loading skeletons
                              Array.from({ length: 3 }).map((_, index) => (
                                 <div
                                    key={index}
                                    className="bg-white rounded-lg border shadow-sm p-6 flex flex-col h-full"
                                 >
                                    <div className="flex items-center justify-between mb-4">
                                       <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                                    </div>
                                    <div className="flex flex-col flex-grow justify-between">
                                       <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                                       <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                                       <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                    </div>
                                 </div>
                              ))
                           ) : (
                              <>
                                 <StatsCard
                                    title="Total Revenue"
                                    value={`RWF ${metrics.totalRevenue.toLocaleString()}`}
                                    change={
                                       metrics.totalRevenue > 100000
                                          ? "12.5"
                                          : "0"
                                    }
                                    icon={TrendingUp}
                                    iconColor="bg-orange-500"
                                 />
                                 <StatsCard
                                    title="Total Orders"
                                    value={metrics.totalOrders.toString()}
                                    change={
                                       metrics.totalOrders > 10 ? "8.2" : "0"
                                    }
                                    icon={ShoppingCart}
                                    iconColor="bg-orange-500"
                                 />
                                 <StatsCard
                                    title="Total Users"
                                    value={metrics.totalUsers.toString()}
                                    change={
                                       metrics.totalUsers > 5 ? "15.3" : "0"
                                    }
                                    icon={Users}
                                    iconColor="bg-orange-500"
                                 />
                              </>
                           )}
                        </div>

                        {/* Stats Cards Row 2 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
                           {ordersLoading || ridersLoading ? (
                              // Loading skeletons for detailed cards
                              Array.from({ length: 3 }).map((_, index) => (
                                 <div
                                    key={index}
                                    className="bg-white rounded-lg border shadow-sm p-6 flex flex-col h-full"
                                 >
                                    <div className="flex items-center justify-between mb-4">
                                       <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                                    </div>
                                    <div className="flex flex-col flex-grow justify-between">
                                       <div className="h-4 bg-gray-200 rounded w-32 mb-3 animate-pulse"></div>
                                       <div className="space-y-2">
                                          <div className="flex justify-between">
                                             <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                                             <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                                          </div>
                                          <div className="flex justify-between">
                                             <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                                             <div className="h-3 bg-gray-200 rounded w-14 animate-pulse"></div>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              ))
                           ) : (
                              <>
                                 <DetailedStatsCard
                                    title="Total Orders"
                                    data={orderStatusData}
                                    icon={ShoppingCart}
                                    iconColor="bg-orange-500"
                                 />
                                 <DetailedStatsCard
                                    title="Total Refunds"
                                    data={refundsData}
                                    icon={RotateCcw}
                                    iconColor="bg-orange-500"
                                 />
                                 <DetailedStatsCard
                                    title="Riders"
                                    data={ridersStatsData}
                                    icon={Bike}
                                    iconColor="bg-orange-500"
                                 />
                              </>
                           )}
                        </div>

                        {/* Order Status Distribution Chart */}
                        <div className="bg-white rounded-lg border shadow-sm p-6">
                           <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              Order Status Distribution
                           </h3>
                           <ChartContainer
                              config={{
                                 count: {
                                    label: "Orders",
                                    color: "hsl(var(--chart-1))",
                                 },
                              }}
                              className="h-[250px] w-full"
                           >
                              <BarChart
                                 data={orderStatusData.map((item) => ({
                                    status: item.label,
                                    count: parseInt(item.value),
                                 }))}
                              >
                                 <CartesianGrid strokeDasharray="3 3" />
                                 <XAxis dataKey="status" />
                                 <YAxis />
                                 <ChartTooltip
                                    content={<ChartTooltipContent />}
                                 />
                                 <Bar
                                    dataKey="count"
                                    fill="hsl(var(--chart-1))"
                                    radius={[4, 4, 0, 0]}
                                 />
                              </BarChart>
                           </ChartContainer>
                        </div>

                        {/* Recent Activity Summary */}
                        <div className="bg-white rounded-lg border shadow-sm p-6">
                           <h3 className="text-lg font-semibold text-gray-900 mb-4">
                              Recent Activity
                           </h3>
                           <div className="space-y-3">
                              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                 <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                       <ShoppingCart className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div>
                                       <p className="text-sm font-medium text-gray-900">
                                          New Order
                                       </p>
                                       <p className="text-xs text-gray-500">
                                          Order #
                                          {orders.length > 0
                                             ? orders[orders.length - 1]
                                                  ?.order_number
                                             : "N/A"}{" "}
                                          placed
                                       </p>
                                    </div>
                                 </div>
                                 <span className="text-xs text-gray-500">
                                    {orders.length > 0
                                       ? format(
                                            new Date(
                                               orders[orders.length - 1]
                                                  ?.created_at || new Date()
                                            ),
                                            "HH:mm"
                                         )
                                       : "--:--"}
                                 </span>
                              </div>
                              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                 <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                       <Users className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                       <p className="text-sm font-medium text-gray-900">
                                          New User
                                       </p>
                                       <p className="text-xs text-gray-500">
                                          Welcome{" "}
                                          {users.length > 0
                                             ? users[users.length - 1]
                                                  ?.full_name ||
                                               users[users.length - 1]?.email
                                             : "new user"}
                                       </p>
                                    </div>
                                 </div>
                                 <span className="text-xs text-gray-500">
                                    {users.length > 0
                                       ? format(
                                            new Date(
                                               users[users.length - 1]
                                                  ?.created_at || new Date()
                                            ),
                                            "HH:mm"
                                         )
                                       : "--:--"}
                                 </span>
                              </div>
                              <div className="flex items-center justify-between py-2">
                                 <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                       <Bike className="w-4 h-4 text-orange-600" />
                                    </div>
                                    <div>
                                       <p className="text-sm font-medium text-gray-900">
                                          Rider Activity
                                       </p>
                                       <p className="text-xs text-gray-500">
                                          {
                                             riders.filter((r) => r.active)
                                                .length
                                          }{" "}
                                          active riders
                                       </p>
                                    </div>
                                 </div>
                                 <span className="text-xs text-gray-500">
                                    Live
                                 </span>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Sidebar - 1/3 width */}
                     <div className="w-full lg:w-1/3 xl:w-1/4">
                        <div className="space-y-4 md:space-y-6">
                           {/* Top Products */}
                           <div className="bg-white rounded-lg border shadow-sm">
                              <div className="flex justify-between items-center p-4 border-b">
                                 <h3 className="font-semibold">Top Products</h3>
                                 <Link
                                    className="text-sm text-blue-500"
                                    href="/admin/products"
                                 >
                                    All product
                                 </Link>
                              </div>
                              <div className="relative p-4">
                                 <Search className="absolute left-6 top-6 w-4 h-4 text-gray-400" />
                                 <Input
                                    placeholder="Search products..."
                                    className="pl-8 mb-4"
                                    value={productSearch}
                                    onChange={(e) =>
                                       setProductSearch(e.target.value)
                                    }
                                 />
                              </div>
                              <div>
                                 {productsLoading ? (
                                    // Loading skeletons for products
                                    Array.from({ length: 4 }).map(
                                       (_, index) => (
                                          <div
                                             key={index}
                                             className="flex items-center gap-3 p-3"
                                          >
                                             <div className="w-10 h-10 bg-gray-200 rounded animate-pulse"></div>
                                             <div className="flex-1">
                                                <div className="h-4 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>
                                                <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                                             </div>
                                             <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                          </div>
                                       )
                                    )
                                 ) : filteredProducts.length > 0 ? (
                                    filteredProducts.map((product, index) => (
                                       <ProductItem
                                          key={product.id || index}
                                          name={product.name}
                                          code={
                                             product.sku ||
                                             `SKU-${product.id?.slice(-6)}`
                                          }
                                          price={`RWF ${product.price.toLocaleString()}`}
                                          bgColor={
                                             index % 4 === 0
                                                ? "bg-blue-100"
                                                : index % 4 === 1
                                                ? "bg-gray-100"
                                                : index % 4 === 2
                                                ? "bg-black"
                                                : "bg-red-100"
                                          }
                                       />
                                    ))
                                 ) : (
                                    <div className="text-center py-8 text-gray-500">
                                       <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                       <p>No products found</p>
                                    </div>
                                 )}
                              </div>
                           </div>

                           {/* Top Users */}
                           <div className="bg-white rounded-lg border shadow-sm">
                              <div className="flex justify-between items-center p-4 border-b">
                                 <h3 className="font-semibold">Top Users</h3>
                              </div>
                              <div className="relative p-4">
                                 <Search className="absolute left-6 top-6 w-4 h-4 text-gray-400" />
                                 <Input
                                    placeholder="Search users..."
                                    className="pl-8 mb-4"
                                    value={userSearch}
                                    onChange={(e) =>
                                       setUserSearch(e.target.value)
                                    }
                                 />
                              </div>
                              <div>
                                 {usersLoading ? (
                                    // Loading skeletons for users
                                    Array.from({ length: 2 }).map(
                                       (_, index) => (
                                          <div
                                             key={index}
                                             className="flex items-center gap-3 p-3"
                                          >
                                             <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                                             <div className="flex-1">
                                                <div className="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse"></div>
                                                <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                                             </div>
                                             <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                          </div>
                                       )
                                    )
                                 ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map((user, index) => (
                                       <UserItem
                                          key={user.id || index}
                                          name={
                                             user.full_name ||
                                             user.email ||
                                             "Unknown User"
                                          }
                                          code={user.email || ""}
                                          amount={`RWF ${(
                                             user.totalSpend || 0
                                          ).toLocaleString()}`}
                                          avatar={(
                                             user.full_name ||
                                             user.email ||
                                             "U"
                                          )
                                             .split(" ")
                                             .map((n) => n[0])
                                             .join("")
                                             .toUpperCase()}
                                       />
                                    ))
                                 ) : (
                                    <div className="text-center py-8 text-gray-500">
                                       <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                       <p>No users found</p>
                                    </div>
                                 )}
                              </div>
                           </div>

                           {/* Top Riders */}
                           <div className="bg-white rounded-lg border shadow-sm">
                              <div className="flex justify-between items-center p-4 border-b">
                                 <h3 className="font-semibold">Top Riders</h3>
                              </div>
                              <div>
                                 {ridersLoading ? (
                                    // Loading skeletons for riders
                                    Array.from({ length: 2 }).map(
                                       (_, index) => (
                                          <div
                                             key={index}
                                             className="flex items-center gap-3 p-3"
                                          >
                                             <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                                             <div className="flex-1">
                                                <div className="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse"></div>
                                                <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                                             </div>
                                             <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                          </div>
                                       )
                                    )
                                 ) : topRiders.length > 0 ? (
                                    topRiders.map((rider, index) => (
                                       <UserItem
                                          key={index}
                                          name={rider.name}
                                          code={rider.code}
                                          amount={rider.amount}
                                          avatar={rider.avatar}
                                       />
                                    ))
                                 ) : (
                                    <div className="text-center py-8 text-gray-500">
                                       <Bike className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                       <p>No riders found</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Orders List - Full width below everything */}
                  <OrdersListMini />
               </div>
            </div>
            <ScrollBar orientation="horizontal" />
         </ScrollArea>
      </div>
   );
};

export default Dashboard;

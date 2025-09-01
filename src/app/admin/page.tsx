"use client";
import React, { useState } from "react";
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
} from "lucide-react";
import { AnalyticsSection } from "@/components/admin/analytics-section";
import OrdersListMini from "@/components/admin/orders-list-mini";
import { format } from "date-fns";
import Link from "next/link";

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
const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, icon: Icon, iconColor }) => (
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
const DetailedStatsCard: React.FC<DetailedStatsCardProps> = ({ title, data, icon: Icon, iconColor }) => (
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
const ProductItem: React.FC<ProductItemProps> = ({ image, name, code, price, bgColor = "bg-gray-100" }) => (
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

   const ordersData: DetailedStatsData[] = [
      { label: "Pending", value: "800" },
      { label: "Approved", value: "1200" },
      { label: "Failed", value: "8" },
      { label: "Successful", value: "12,000" },
   ];

   const refundsData: DetailedStatsData[] = [
      { label: "Total Refunded Orders", value: "2,000" },
      { label: "Total Refunded Money", value: "140,000" },
   ];

   const ridersData: DetailedStatsData[] = [
      { label: "Total Orders", value: "18,000 RWF" },
      { label: "Total Money", value: "21,000,000" },
   ];

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
                           <StatsCard
                              title="Profit"
                              value="RWF 2,500,000"
                              change="80"
                              icon={TrendingUp}
                              iconColor="bg-orange-500"
                           />
                           <StatsCard
                              title="Total Revenue"
                              value="RWF 520,000"
                              change="80"
                              icon={TrendingUp}
                              iconColor="bg-orange-500"
                           />
                           <StatsCard
                              title="Total Users"
                              value="4,000"
                              change="90"
                              icon={Users}
                              iconColor="bg-orange-500"
                           />
                        </div>

                        {/* Stats Cards Row 2 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
                           <DetailedStatsCard
                              title="Total Orders"
                              data={ordersData}
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
                              data={ridersData}
                              icon={Bike}
                              iconColor="bg-orange-500"
                           />
                        </div>

                        {/* Analytics Section */}
                        <AnalyticsSection />
                     </div>

                     {/* Sidebar - 1/3 width */}
                     <div className="w-full lg:w-1/3 xl:w-1/4">
                        <div className="space-y-4 md:space-y-6">
                           {/* Top Products */}
                           <div className="bg-white rounded-lg border shadow-sm">
                              <div className="flex justify-between items-center p-4 border-b">
                                 <h3 className="font-semibold">Top Products</h3>
                                 <Link className="text-sm text-blue-500" href="/admin/products">
                                    All product
                                 </Link>
                              </div>
                              <div className="relative p-4">
                                 <Search className="absolute left-6 top-6 w-4 h-4 text-gray-400" />
                                 <Input
                                    placeholder="Search"
                                    className="pl-8 mb-4"
                                 />
                              </div>
                              <div>
                                 <ProductItem
                                    name="Apple iPhone 13"
                                    code="APP-FRZ-847"
                                    price="RWF 500,000"
                                    bgColor="bg-blue-100"
                                 />
                                 <ProductItem
                                    name="Nike Air Jordan"
                                    code="NIK-FRZ-847"
                                    price="RWF 52,000"
                                    bgColor="bg-gray-100"
                                 />
                                 <ProductItem
                                    name="T-shirt"
                                    code="TSH-FRZ-847"
                                    price="RWF 10,000"
                                    bgColor="bg-black"
                                 />
                                 <ProductItem
                                    name="Cross Bag"
                                    code="CRO-FRZ-847"
                                    price="RWF 25,000"
                                    bgColor="bg-red-100"
                                 />
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
                                    placeholder="Search"
                                    className="pl-8 mb-4"
                                 />
                              </div>
                              <div>
                                 <UserItem
                                    name="Severin R"
                                    code="RF 131 Y"
                                    amount="RWF 32,000"
                                    avatar="SR"
                                 />
                                 <UserItem
                                    name="Severin R"
                                    code="RF 131 Y"
                                    amount="RWF 32,000"
                                    avatar="SR"
                                 />
                              </div>
                           </div>

                           {/* Top Riders */}
                           <div className="bg-white rounded-lg border shadow-sm">
                              <div className="flex justify-between items-center p-4 border-b">
                                 <h3 className="font-semibold">Top Riders</h3>
                              </div>
                              <div>
                                 <UserItem
                                    name="Kevin N"
                                    code="serving"
                                    amount="RWF 250,000"
                                    avatar="KN"
                                 />
                                 <UserItem
                                    name="Kevin N"
                                    code="serving"
                                    amount="RWF 250,000"
                                    avatar="KN"
                                 />
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
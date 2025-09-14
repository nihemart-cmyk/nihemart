"use client";
import { RiderAnalytics } from "@/components/rider/RiderAnalytics";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
   Box,
   Clock,
   LucideIcon,
   MapPin,
   Star,
   Timer,
   TrendingDown,
   TrendingUp,
   Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchRiderByUserId } from "@/integrations/supabase/riders";
import { useRiderAssignments } from "@/hooks/useRiders";

interface StatsCardProps {
   title: string;
   value: string;
   change?: string;
   icon: LucideIcon;
   iconColor: string;
}

interface ActiveRiderProps {
   id: string;
   name: string;
   location: string;
   status: string;
   rating: string;
   deliveries: string;
}

interface RecentDeliveryProps {
   id: string;
   name: string;
   location: string;
   status: string;
   amount: string;
   time: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
   title,
   value,
   change,
   icon: Icon,
   iconColor,
}) => (
   <div className="bg-white rounded-xl border shadow-sm p-6 flex flex-col h-full">
      <div className="flex">
         <div className="flex flex-col flex-grow justify-between">
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
            {change && (
               <div className="flex items-center gap-1 mt-auto">
                  {Number(change) < 0 ? (
                     <TrendingDown className="w-4 h-4 text-red-500" />
                  ) : (
                     <TrendingUp className="w-4 h-4 text-green-500" />
                  )}
                  <span
                     className={`text-sm ${
                        Number(change) < 0 ? "text-red-500" : "text-green-500"
                     }`}
                  >
                     {change}%
                  </span>
                  <span className="text-sm text-gray-500">vs last 7 days</span>
               </div>
            )}
         </div>
         <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-lg ${iconColor}`}>
               <Icon className="w-5 h-5 text-white" />
            </div>
         </div>
      </div>
   </div>
);

const ActiveRiderCard: React.FC<ActiveRiderProps> = ({
   id,
   name,
   location,
   deliveries,
   rating,
   status,
}) => (
   <div className="bg-white rounded-xl border shadow-sm p-4 h-full">
      <div className="flex items-start justify-between gap-4">
         <div className="flex items-start gap-4">
            <div className="p-5 rounded-full bg-blue-500">
               <div className="w-2 h-2"></div>
            </div>
            <div>
               <h1 className="font-bold">{name}</h1>
               <p>#{id}</p>
            </div>
         </div>
         <Badge className="bg-orange-500 hover:bg-orange-500">{status}</Badge>
      </div>

      <div className="mt-5">
         <p className="flex gap-1 items-center text-gray-600 mb-3">
            <MapPin />
            {location}
         </p>
         <div className="flex items-center justify-between text-gray-600">
            <p className="flex gap-1 items-center text-gray-600 mb-3">
               <Star
                  className="text-orange-500 outline-none"
                  fill="#EFB100"
               />
               {rating}
            </p>
            <p>{deliveries} deliveries</p>
         </div>
         <p className="flex gap-1 items-center text-gray-600">
            <Clock />
            Last active: Now
         </p>
      </div>
   </div>
);

const RecentDelivery: React.FC<RecentDeliveryProps> = ({
   id,
   name,
   location,
   amount,
   time,
   status,
}) => (
   <div className="bg-gray-100 rounded-xl border shadow-sm p-4 h-full flex flex-col sm:flex-row justify-between my-5 gap-4">
      <div className="flex-1">
         <div className="flex items-center gap-4">
            <div className="p-5 rounded-full bg-orange-500 flex-shrink-0">
               <div className="w-2 h-2"></div>
            </div>
            <div>
               <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
                  <h1 className="font-bold text-base sm:text-lg">#{id}</h1>
                  <Badge className="bg-green-500 hover:bg-green-500 text-xs sm:text-sm">
                     {status}
                  </Badge>
               </div>
               <p className="text-sm sm:text-base">{name}</p>
               <p className="flex items-center gap-2 text-xs sm:text-sm">
                  <MapPin /> {location}
               </p>
            </div>
         </div>
      </div>
      <div className="flex flex-row sm:flex-col items-end sm:items-start justify-between sm:justify-end gap-2 sm:gap-0">
         <p className="text-sm sm:text-base font-semibold">RWF {amount}</p>
         <p className="flex items-center gap-2 text-xs sm:text-sm">
            <Clock
               size={16}
               className="sm:size-[18px]"
            />
            {time} ago
         </p>
      </div>
   </div>
);

const Dashboard = () => {
   const { user, isLoggedIn } = useAuth();
   const [rider, setRider] = useState<any | null>(null);
   useEffect(() => {
      if (!user) return;
      fetchRiderByUserId(user.id)
         .then((r) => setRider(r))
         .catch(console.error);
   }, [user]);

   const { data: assignments = [], isLoading } = useRiderAssignments(rider?.id);

   const totalDeliveries = assignments.length;
   const delivered = assignments.filter(
      (a: any) => a.status === "completed" || a.status === "delivered"
   ).length;
   const avgDeliveryTime = "--"; // could compute if timestamps exist

   const recent = assignments.slice(0, 5).map((a: any) => {
      const order =
         a.orders || a.order || (a.order_id ? { id: a.order_id } : null);
      return {
         id: order?.id || a.order_id,
         name: order?.customer_name || order?.name || "Customer",
         location: order?.delivery_address || a.location || "-",
         amount: order?.total || order?.subtotal || a.amount || "-",
         time: "-",
         status: a.status || order?.status || "-",
      };
   });

   if (!isLoggedIn) return <div className="p-6">Please sign in.</div>;

   return (
      <div className="min-h-screen">
         <ScrollArea className="h-[calc(100vh-2rem)]">
            {/* TOP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 m-5">
               <StatsCard
                  title="Active"
                  value={rider?.active ? "Yes" : "No"}
                  change={"0"}
                  icon={Users}
                  iconColor="bg-orange-500"
               />
               <StatsCard
                  title="Total Deliveries"
                  value={`${totalDeliveries}`}
                  change={"0"}
                  icon={Box}
                  iconColor="bg-blue-500"
               />
               <StatsCard
                  title="Delivered"
                  value={`${delivered}`}
                  change={"0"}
                  icon={Timer}
                  iconColor="bg-green-500"
               />
            </div>
            {/* BOTTOM */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-1 m-5 items-center">
               {/* LEFT */}
               <div className="grid grid-cols-1 gap-4 md:gap-6 m-5 lg:w-[40%] w-full">
                  <h1 className="font-bold">Your Profile</h1>
                  <ActiveRiderCard
                     id={rider?.id || "-"}
                     name={rider?.full_name || user?.email || "Rider"}
                     location={rider?.city || "-"}
                     deliveries={`${totalDeliveries}`}
                     rating={"4.8"}
                     status={rider?.active ? "Active" : "Unavailable"}
                  />
               </div>
               {/* RIGHT */}
               <div className="w-full">
                  <div>
                     <RiderAnalytics />
                  </div>
                  <div className="bg-white rounded-2xl border shadow-sm p-4 mt-5">
                     <h1>Recent Deliveries</h1>
                     {recent.map((r: any) => (
                        <RecentDelivery
                           key={r.id}
                           id={r.id}
                           name={r.name}
                           location={r.location}
                           amount={`${r.amount}`}
                           time={r.time}
                           status={r.status}
                        />
                     ))}
                  </div>
               </div>
            </div>
         </ScrollArea>
      </div>
   );
};

export default Dashboard;

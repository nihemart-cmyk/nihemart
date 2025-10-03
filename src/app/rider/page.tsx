"use client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
   Package,
   Target,
   Navigation,
   CheckCircle,
   XCircle,
   DollarSign,
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
   gradient: string;
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
   gradient,
}) => (
   <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
      <CardContent className="p-0">
         <div className={`${gradient} p-4 sm:p-6 text-white relative`}>
            <div className="flex items-center justify-between">
               <div className="space-y-1 sm:space-y-2">
                  <p className="text-white/80 text-xs sm:text-sm font-medium">
                     {title}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold">{value}</p>
                  {change && (
                     <div className="flex items-center gap-1">
                        {Number(change) < 0 ? (
                           <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-white/80" />
                        ) : (
                           <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white/80" />
                        )}
                        <span className="text-xs sm:text-sm text-white/80">
                           {change}% vs last week
                        </span>
                     </div>
                  )}
               </div>
               <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
               </div>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full"></div>
            <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white/5 rounded-full"></div>
         </div>
      </CardContent>
   </Card>
);

const ActiveRiderCard: React.FC<ActiveRiderProps> = ({
   id,
   name,
   location,
   deliveries,
   rating,
   status,
}) => (
   <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
         <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
            Your Profile
         </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
         <div className="flex items-start gap-3 sm:gap-4">
            <div className="relative flex-shrink-0">
               <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center">
                     <Users className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                  </div>
               </div>
               <div
                  className={`absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white ${
                     status === "Active" ? "bg-green-500" : "bg-red-500"
                  }`}
               ></div>
            </div>
            <div className="flex-1 min-w-0">
               <h3 className="font-bold text-lg sm:text-xl text-gray-900 truncate">
                  {name}
               </h3>
               <p className="text-gray-500 text-xs sm:text-sm truncate">
                  ID: #{id}
               </p>
               <Badge
                  className={`mt-2 text-xs ${
                     status === "Active"
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                  }`}
               >
                  {status}
               </Badge>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
               <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-lg mx-auto mb-2">
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
               </div>
               <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {deliveries}
               </p>
               <p className="text-xs sm:text-sm text-gray-500">
                  Total Deliveries
               </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
               <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-yellow-100 rounded-lg mx-auto mb-2">
                  <Star
                     className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600"
                     fill="currentColor"
                  />
               </div>
               <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {rating}
               </p>
               <p className="text-xs sm:text-sm text-gray-500">Rating</p>
            </div>
         </div>

         <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-600">
               <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </div>
               <span className="text-xs sm:text-sm truncate">{location}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
               <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </div>
               <span className="text-xs sm:text-sm">Last active: Now</span>
            </div>
         </div>
      </CardContent>
   </Card>
);

const RecentDelivery: React.FC<RecentDeliveryProps> = ({
   id,
   name,
   location,
   amount,
   time,
   status,
}) => (
   <Card className="border-0 bg-gray-50 hover:bg-gray-100 transition-all duration-200 hover:shadow-md">
      <CardContent className="p-3 sm:p-4">
         <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
               <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
               </div>
               <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                     <span className="font-semibold text-sm sm:text-base text-gray-900">
                        #{id}
                     </span>
                     <Badge
                        className={`text-xs ${
                           status === "completed" || status === "delivered"
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : status === "processing"
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-100"
                        }`}
                     >
                        {status}
                     </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">
                     {name}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                     <MapPin className="w-3 h-3 flex-shrink-0" />
                     <span className="truncate">{location}</span>
                  </div>
               </div>
            </div>
            <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-start sm:text-right sm:space-y-1 flex-shrink-0">
               <p className="font-bold text-sm sm:text-base text-gray-900 whitespace-nowrap">
                  RWF {amount}
               </p>
               <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span className="whitespace-nowrap">{time} ago</span>
               </div>
            </div>
         </div>
      </CardContent>
   </Card>
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
   const pending = assignments.filter(
      (a: any) => a.status === "assigned"
   ).length;

   const accepted = assignments.filter(
      (a: any) => a.status === "accepted"
   ).length;
   const rejected = assignments.filter(
      (a: any) =>
         a.status === "rejected" ||
         a.status === "declined" ||
         a.status === "cancelled"
   ).length;

   const earned = assignments.reduce((sum: number, a: any) => {
      const isDone = a.status === "completed" || a.status === "delivered";
      if (!isDone) return sum;
      const order =
         a.orders || a.order || (a.order_id ? { id: a.order_id } : null);
      const amount = order?.total ?? order?.subtotal ?? a.amount ?? 0;
      const parsed =
         typeof amount === "string" ? parseFloat(amount) : Number(amount || 0);
      return sum + (isNaN(parsed) ? 0 : parsed);
   }, 0);

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

   // Derived metrics for today's analytics
   const now = new Date();
   const isSameDay = (d: Date) =>
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

   const parseDate = (value: any): Date | null => {
      if (!value) return null;
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
   };

   const todaysAssignments = assignments.filter((a: any) => {
      const order = a.orders || a.order || null;
      const timestamps = [
         a.delivered_at,
         a.completed_at,
         a.updated_at,
         a.created_at,
         order?.delivered_at,
         order?.completed_at,
         order?.updated_at,
         order?.created_at,
      ]
         .map(parseDate)
         .filter(Boolean) as Date[];
      const ts = timestamps[0];
      if (!ts) return false;
      return isSameDay(ts);
   });

   const todaysTotal = todaysAssignments.reduce((sum: number, a: any) => {
      const isDone = a.status === "completed" || a.status === "delivered";
      if (!isDone) return sum;
      const order =
         a.orders || a.order || (a.order_id ? { id: a.order_id } : null);
      const amount = order?.total ?? order?.subtotal ?? a.amount ?? 0;
      const parsed =
         typeof amount === "string" ? parseFloat(amount) : Number(amount || 0);
      return sum + (isNaN(parsed) ? 0 : parsed);
   }, 0);

   const peakHour = (() => {
      const hoursCount: Record<string, number> = {};
      todaysAssignments.forEach((a: any) => {
         const order = a.orders || a.order || null;
         const timestamps = [
            a.delivered_at,
            a.completed_at,
            a.updated_at,
            a.created_at,
            order?.delivered_at,
            order?.completed_at,
            order?.updated_at,
            order?.created_at,
         ]
            .map(parseDate)
            .filter(Boolean) as Date[];
         const ts = timestamps[0];
         if (!ts) return;
         const hour = ts.getHours();
         hoursCount[hour] = (hoursCount[hour] || 0) + 1;
      });
      const top = Object.entries(hoursCount).sort((a, b) => b[1] - a[1])[0];
      if (!top) return "-";
      const h = Number(top[0]);
      return `${String(h).padStart(2, "0")}:00`;
   })();

   const averageRating = rider?.average_rating || rider?.rating || "4.8";

   if (!isLoggedIn) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center p-4">
            <Card className="p-6 sm:p-8 text-center max-w-md w-full">
               <CardContent>
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">
                     Please Sign In
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                     You need to sign in to access your dashboard.
                  </p>
               </CardContent>
            </Card>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
         <ScrollArea className="h-[calc(100vh-2rem)]">
            <div className="mx-auto p-3 sm:p-4 md:p-6 max-w-7xl">
               {/* Welcome Section */}
               <div className="mb-6 sm:mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                     Welcome back, {rider?.full_name || user?.email || "Rider"}!
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600">
                     Here&apos;s your delivery overview for today.
                  </p>
               </div>

               {/* Stats Cards */}
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
                  <StatsCard
                     title="Status"
                     value={rider?.active ? "Active" : "Inactive"}
                     change={"0"}
                     icon={Users}
                     gradient="bg-gradient-to-br from-orange-500 to-orange-600"
                  />
                  <StatsCard
                     title="Total Orders"
                     value={`${totalDeliveries}`}
                     change={"0"}
                     icon={Box}
                     gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                  />
                  <StatsCard
                     title="Completed"
                     value={`${delivered}`}
                     change={"0"}
                     icon={Target}
                     gradient="bg-gradient-to-br from-green-500 to-green-600"
                  />
                  <StatsCard
                     title="Pending"
                     value={`${pending}`}
                     change={"0"}
                     icon={Timer}
                     gradient="bg-gradient-to-br from-purple-500 to-purple-600"
                  />
               </div>

               {/* Main Content */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                  {/* Profile Card */}
                  <div className="lg:col-span-1">
                     <ActiveRiderCard
                        id={rider?.id || "-"}
                        name={rider?.full_name || user?.email || "Rider"}
                        location={rider?.city || "-"}
                        deliveries={`${totalDeliveries}`}
                        rating={"4.8"}
                        status={rider?.active ? "Active" : "Unavailable"}
                     />
                  </div>

                  {/* Analytics and Recent Deliveries */}
                  <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                     <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                           <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                              <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                              Delivery Analytics
                           </CardTitle>
                        </CardHeader>
                        <CardContent>
                           <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                              <StatsCard
                                 title="Accepted"
                                 value={`${accepted}`}
                                 change={"0"}
                                 icon={CheckCircle}
                                 gradient="bg-gradient-to-br from-blue-500 to-blue-600"
                              />
                              <StatsCard
                                 title="Rejected"
                                 value={`${rejected}`}
                                 change={"0"}
                                 icon={XCircle}
                                 gradient="bg-gradient-to-br from-red-500 to-red-600"
                              />
                              <StatsCard
                                 title="Earned"
                                 value={`RWF ${earned.toLocaleString()}`}
                                 change={"0"}
                                 icon={DollarSign}
                                 gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
                              />
                              {/* Transparent cards with gradient borders */}
                              <div className="p-[1px] rounded-xl bg-gradient-to-r from-orange-500 to-pink-600">
                                 <div className="rounded-[11px] bg-white dark:bg-gray-950 p-4 sm:p-6 h-full">
                                    <div className="flex items-center justify-between">
                                       <div className="space-y-1">
                                          <p className="text-gray-500 text-xs sm:text-sm">
                                             Today&apos;s total
                                          </p>
                                          <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                             RWF {todaysTotal.toLocaleString()}
                                          </p>
                                       </div>
                                       <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                          <DollarSign className="w-5 h-5 text-orange-600" />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                              <div className="p-[1px] rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600">
                                 <div className="rounded-[11px] bg-white dark:bg-gray-950 p-4 sm:p-6 h-full">
                                    <div className="flex items-center justify-between">
                                       <div className="space-y-1">
                                          <p className="text-gray-500 text-xs sm:text-sm">
                                             Peak hour
                                          </p>
                                          <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                             {peakHour}
                                          </p>
                                       </div>
                                       <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                          <Clock className="w-5 h-5 text-blue-600" />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                              <div className="p-[1px] rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-600">
                                 <div className="rounded-[11px] bg-white dark:bg-gray-950 p-4 sm:p-6 h-full">
                                    <div className="flex items-center justify-between">
                                       <div className="space-y-1">
                                          <p className="text-gray-500 text-xs sm:text-sm">
                                             Average rating
                                          </p>
                                          <p className="text-xl sm:text-2xl font-bold text-gray-900">
                                             {averageRating}
                                          </p>
                                       </div>
                                       <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                          <Star
                                             className="w-5 h-5 text-purple-600"
                                             fill="currentColor"
                                          />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                     <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                           <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                              <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                              Recent Deliveries
                           </CardTitle>
                        </CardHeader>
                        <CardContent>
                           {isLoading ? (
                              <div className="flex items-center justify-center py-8">
                                 <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                              </div>
                           ) : recent.length > 0 ? (
                              <div className="space-y-3">
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
                           ) : (
                              <div className="text-center py-8 text-gray-500">
                                 <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                                 <p className="text-sm sm:text-base">
                                    No recent deliveries
                                 </p>
                              </div>
                           )}
                        </CardContent>
                     </Card>
                  </div>
               </div>
            </div>
         </ScrollArea>
      </div>
   );
};

export default Dashboard;

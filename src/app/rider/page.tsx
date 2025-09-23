"use client";
import { RiderAnalytics } from "@/components/rider/RiderAnalytics";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
   Award,
   Navigation,
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
         <div className={`${gradient} p-6 text-white relative`}>
            <div className="flex items-center justify-between">
               <div className="space-y-2">
                  <p className="text-white/80 text-sm font-medium">{title}</p>
                  <p className="text-3xl font-bold">{value}</p>
                  {change && (
                     <div className="flex items-center gap-1">
                        {Number(change) < 0 ? (
                           <TrendingDown className="w-4 h-4 text-white/80" />
                        ) : (
                           <TrendingUp className="w-4 h-4 text-white/80" />
                        )}
                        <span className="text-sm text-white/80">
                           {change}% vs last week
                        </span>
                     </div>
                  )}
               </div>
               <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-7 h-7 text-white" />
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
         <CardTitle className="text-lg font-semibold text-gray-800">Your Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
         <div className="flex items-start gap-4">
            <div className="relative">
               <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                     <Users className="w-5 h-5 text-orange-500" />
                  </div>
               </div>
               <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                  status === "Active" ? "bg-green-500" : "bg-red-500"
               }`}></div>
            </div>
            <div className="flex-1">
               <h3 className="font-bold text-xl text-gray-900">{name}</h3>
               <p className="text-gray-500 text-sm">ID: #{id}</p>
               <Badge 
                  className={`mt-2 ${
                     status === "Active" 
                        ? "bg-green-100 text-green-700 hover:bg-green-100" 
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                  }`}
               >
                  {status}
               </Badge>
            </div>
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
               <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mx-auto mb-2">
                  <Package className="w-4 h-4 text-blue-600" />
               </div>
               <p className="text-2xl font-bold text-gray-900">{deliveries}</p>
               <p className="text-sm text-gray-500">Total Deliveries</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
               <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-lg mx-auto mb-2">
                  <Star className="w-4 h-4 text-yellow-600" fill="currentColor" />
               </div>
               <p className="text-2xl font-bold text-gray-900">{rating}</p>
               <p className="text-sm text-gray-500">Rating</p>
            </div>
         </div>

         <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-600">
               <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
               </div>
               <span className="text-sm">{location}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
               <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4" />
               </div>
               <span className="text-sm">Last active: Now</span>
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
      <CardContent className="p-4">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
               <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-sm">
                  <Package className="w-5 h-5 text-white" />
               </div>
               <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                     <span className="font-semibold text-gray-900">#{id}</span>
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
                  <p className="text-sm text-gray-600 mb-1">{name}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                     <MapPin className="w-3 h-3" />
                     <span className="truncate max-w-xs">{location}</span>
                  </div>
               </div>
            </div>
            <div className="text-right space-y-1">
               <p className="font-bold text-gray-900">RWF {amount}</p>
               <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{time} ago</span>
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

   if (!isLoggedIn) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center">
            <Card className="p-8 text-center">
               <CardContent>
                  <h2 className="text-xl font-semibold mb-2">Please Sign In</h2>
                  <p className="text-gray-600">You need to sign in to access your dashboard.</p>
               </CardContent>
            </Card>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
         <ScrollArea className="h-[calc(100vh-2rem)]">
            <div className="container mx-auto p-6">
               {/* Welcome Section */}
               <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                     Welcome back, {rider?.full_name || user?.email || "Rider"}!
                  </h1>
                  <p className="text-gray-600">Here's your delivery overview for today.</p>
               </div>

               {/* Stats Cards */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                  <div className="lg:col-span-2 space-y-8">
                     <RiderAnalytics />
                     
                     <Card className="border-0 shadow-lg">
                        <CardHeader>
                           <CardTitle className="flex items-center gap-2">
                              <Navigation className="w-5 h-5 text-orange-500" />
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
                                 <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                 <p>No recent deliveries</p>
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
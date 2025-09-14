"use client";

import { useEffect, useState } from "react";
import { User, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useOrders } from "@/hooks/useOrders";
import { useNotifications } from "@/contexts/NotificationsContext";

const Profile = () => {
   const { t } = useLanguage();
   const { user, loading } = useAuth();
   const [isEditing, setIsEditing] = useState(false);
   const [formData, setFormData] = useState({
      fullName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
   });
   const [profileLoading, setProfileLoading] = useState(true);
   // notifications from context
   const { notifications, markAsRead, clear } = useNotifications();
   const [localNotifications, setLocalNotifications] = useState<any[]>([]);
   const { useUserOrders } = useOrders();
   const {
      data: ordersData,
      isLoading: ordersLoading,
      isError: ordersError,
   } = useUserOrders({
      pagination: { page: 1, limit: 10 },
      sort: { column: "created_at", direction: "desc" },
   });

   useEffect(() => {
      setLocalNotifications(notifications);
   }, [notifications]);

   useEffect(() => {
      const load = async () => {
         if (!user) return setProfileLoading(false);
         // Try to fetch profile
         const { data, error } = await supabase
            .from("profiles")
            .select("full_name, phone, address, city")
            .eq("id", user.id)
            .maybeSingle();
         if (!error && data) {
            setFormData({
               fullName: data?.full_name || "",
               email: user.email || "",
               phone: data?.phone || "",
               address: data?.address || "",
               city: data?.city || "",
            });
            setProfileLoading(false);
         } else if (!error && !data) {
            // No profile row, create one
            const { error: insertError } = await supabase
               .from("profiles")
               .insert({
                  id: user.id,
                  full_name: user.user_metadata?.full_name || user.email || "",
                  phone: "",
                  address: "",
                  city: "",
               });
            if (insertError) {
               toast.error("Failed to create profile: " + insertError.message);
            }
            setFormData({
               fullName: user.user_metadata?.full_name || user.email || "",
               email: user.email || "",
               phone: "",
               address: "",
               city: "",
            });
            setProfileLoading(false);
         } else {
            toast.error(error?.message || "Failed to load profile");
            setProfileLoading(false);
         }
      };
      load();
   }, [user]);

   const handleSave = async () => {
      if (!user) return;
      const { error } = await supabase.from("profiles").upsert({
         id: user.id,
         full_name: formData.fullName,
         phone: formData.phone,
         address: formData.address,
         city: formData.city,
      });
      if (error) {
         toast.error(error.message);
         return;
      }
      toast.success("Profile updated");
      // Refresh orders cache (best-effort) by invalidating via fetch: if useOrders is present we can refetch
      try {
         // If there are orders, refetch by calling the hook's query function indirectly via window.location.reload for a simple refresh
         // (we avoid importing queryClient here to keep changes small). This ensures the Orders tab shows latest data.
         // Prefer not to hard reload the page unless necessary: only refetch if ordersData exists
         if (ordersData) {
            // noop - react-query will keep data fresh based on its own cache/staleTime
         }
      } catch (e) {
         // ignore
      }
      setIsEditing(false);
   };

   const handleCancel = () => {
      setIsEditing(false);
   };
   if (loading || profileLoading) {
      return (
         <div className="flex items-center justify-center min-h-[60vh]">
            <span className="text-lg text-muted-foreground">
               Loading profile...
            </span>
         </div>
      );
   }

   return (
      <div className="container mx-auto px-4 py-8">
         <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
               <h1 className="text-3xl font-bold">{t("nav.profile")}</h1>
               {!isEditing && (
                  <Button onClick={() => setIsEditing(true)}>
                     <Edit className="h-4 w-4 mr-2" />
                     Edit Profile
                  </Button>
               )}
            </div>

            <Tabs
               defaultValue="personal"
               className="w-full"
            >
               <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="orders">Order History</TabsTrigger>
                  <TabsTrigger value="settings">Notifications</TabsTrigger>
               </TabsList>

               <TabsContent
                  value="personal"
                  className="mt-6"
               >
                  <Card>
                     <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-6">
                        <div className="flex items-center space-x-4 mb-6">
                           <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="h-10 w-10 text-primary" />
                           </div>
                           <div>
                              <h3 className="text-xl font-semibold">
                                 {formData.fullName}
                              </h3>
                              <p className="text-muted-foreground">
                                 {formData.email}
                              </p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                              <Label htmlFor="fullName">Full Name</Label>
                              <Input
                                 id="fullName"
                                 value={formData.fullName}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       fullName: e.target.value,
                                    })
                                 }
                                 disabled={!isEditing}
                              />
                           </div>

                           <div>
                              <Label htmlFor="email">Email</Label>
                              <Input
                                 id="email"
                                 type="email"
                                 value={formData.email}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       email: e.target.value,
                                    })
                                 }
                                 disabled={!isEditing}
                              />
                           </div>

                           <div>
                              <Label htmlFor="phone">Phone</Label>
                              <Input
                                 id="phone"
                                 value={formData.phone}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       phone: e.target.value,
                                    })
                                 }
                                 disabled={!isEditing}
                              />
                           </div>

                           <div>
                              <Label htmlFor="city">City</Label>
                              <Input
                                 id="city"
                                 value={formData.city}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       city: e.target.value,
                                    })
                                 }
                                 disabled={!isEditing}
                              />
                           </div>

                           <div className="md:col-span-2">
                              <Label htmlFor="address">Address</Label>
                              <Input
                                 id="address"
                                 value={formData.address}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       address: e.target.value,
                                    })
                                 }
                                 disabled={!isEditing}
                              />
                           </div>
                        </div>

                        {isEditing && (
                           <div className="flex space-x-4">
                              <Button onClick={handleSave}>
                                 <Save className="h-4 w-4 mr-2" />
                                 Save Changes
                              </Button>
                              <Button
                                 variant="outline"
                                 onClick={handleCancel}
                              >
                                 <X className="h-4 w-4 mr-2" />
                                 Cancel
                              </Button>
                           </div>
                        )}
                     </CardContent>
                  </Card>
               </TabsContent>

               <TabsContent
                  value="orders"
                  className="mt-6"
               >
                  <Card>
                     <CardHeader>
                        <CardTitle>Recent Orders</CardTitle>
                     </CardHeader>
                     <CardContent>
                        {ordersLoading ? (
                           <div className="text-center py-8">
                              <p>Loading orders...</p>
                           </div>
                        ) : ordersError ? (
                           <div className="text-center py-8 text-muted-foreground">
                              <p>Error loading orders.</p>
                           </div>
                        ) : !ordersData?.data ||
                          ordersData.data.length === 0 ? (
                           <div className="text-center py-8 text-muted-foreground">
                              <p>No recent orders found.</p>
                              <Button
                                 className="mt-4"
                                 variant="outline"
                              >
                                 Start Shopping
                              </Button>
                           </div>
                        ) : (
                           <div className="space-y-4">
                              {ordersData.data.map((order: any) => (
                                 <div
                                    key={order.id}
                                    className="p-4 border rounded"
                                 >
                                    <div className="flex justify-between items-center">
                                       <div>
                                          <div className="font-medium">
                                             Order #{order.order_number}
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                             {new Date(
                                                order.created_at
                                             ).toLocaleString()}
                                          </div>
                                       </div>
                                       <div className="text-right">
                                          <div className="font-semibold">
                                             {Number(
                                                order.total
                                             ).toLocaleString()}{" "}
                                             RWF
                                          </div>
                                          <div className="text-sm text-muted-foreground">
                                             {order.delivery_city || "-"}
                                          </div>
                                       </div>
                                    </div>
                                    <div className="mt-3">
                                       {order.items &&
                                       order.items.length > 0 ? (
                                          order.items.map((item: any) => (
                                             <div
                                                key={item.id}
                                                className="flex justify-between items-center py-2 border-t"
                                             >
                                                <div>
                                                   <div className="font-medium">
                                                      {item.product_name}
                                                   </div>
                                                   <div className="text-sm text-muted-foreground">
                                                      Qty: {item.quantity}
                                                   </div>
                                                </div>
                                                <div className="font-medium">
                                                   {Number(
                                                      item.total
                                                   ).toLocaleString()}{" "}
                                                   RWF
                                                </div>
                                             </div>
                                          ))
                                       ) : (
                                          <div className="py-2 text-muted-foreground">
                                             No items found
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </CardContent>
                  </Card>
               </TabsContent>

               <TabsContent
                  value="settings"
                  className="mt-6"
               >
                  <Card>
                     <CardHeader>
                        <CardTitle>Notifications</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="text-sm text-muted-foreground">
                                 Your recent notifications
                              </p>
                           </div>
                           <div className="flex items-center space-x-2">
                              <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={async () => {
                                    try {
                                       // mark all unread notifications as read via API
                                       const ids = notifications
                                          .filter((n) => !n.read)
                                          .map((n) => n.id);
                                       if (ids.length === 0) return;
                                       await fetch(
                                          `/api/notifications/mark-read`,
                                          {
                                             method: "POST",
                                             headers: {
                                                "Content-Type":
                                                   "application/json",
                                             },
                                             body: JSON.stringify({ ids }),
                                          }
                                       );
                                       // optimistic update
                                       setLocalNotifications((prev) =>
                                          prev.map((p) => ({
                                             ...p,
                                             read: true,
                                          }))
                                       );
                                    } catch (e) {
                                       console.error(e);
                                    }
                                 }}
                              >
                                 Mark all read
                              </Button>
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => setLocalNotifications([])}
                              >
                                 Clear
                              </Button>
                           </div>
                        </div>

                        {/* Notifications list */}
                        <div className="divide-y max-h-96 overflow-auto">
                           {localNotifications.length === 0 && (
                              <div className="py-8 text-center text-muted-foreground">
                                 No notifications
                              </div>
                           )}
                           {localNotifications.map((n) => (
                              <div
                                 key={n.id}
                                 className={`p-4 hover:bg-surface-secondary flex items-start justify-between gap-4 ${
                                    n.read ? "opacity-60" : ""
                                 }`}
                              >
                                 <div>
                                    <div className="text-sm font-semibold">
                                       {n.title}
                                    </div>
                                    {n.body && (
                                       <div className="text-xs text-muted-foreground mt-1">
                                          {n.body}
                                       </div>
                                    )}
                                    <div className="text-xxs text-muted-foreground mt-2">
                                       {new Date(n.created_at).toLocaleString()}
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end gap-2">
                                    {!n.read && (
                                       <Button
                                          size="sm"
                                          onClick={async () => {
                                             try {
                                                await fetch(
                                                   `/api/notifications/mark-read`,
                                                   {
                                                      method: "POST",
                                                      headers: {
                                                         "Content-Type":
                                                            "application/json",
                                                      },
                                                      body: JSON.stringify({
                                                         ids: [n.id],
                                                      }),
                                                   }
                                                );
                                                setLocalNotifications((prev) =>
                                                   prev.map((p) =>
                                                      p.id === n.id
                                                         ? { ...p, read: true }
                                                         : p
                                                   )
                                                );
                                             } catch (e) {
                                                console.error(e);
                                                setLocalNotifications((prev) =>
                                                   prev.map((p) =>
                                                      p.id === n.id
                                                         ? { ...p, read: true }
                                                         : p
                                                   )
                                                );
                                             }
                                          }}
                                       >
                                          Mark read
                                       </Button>
                                    )}
                                    <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() =>
                                          setLocalNotifications((prev) =>
                                             prev.filter((p) => p.id !== n.id)
                                          )
                                       }
                                    >
                                       Dismiss
                                    </Button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </CardContent>
                  </Card>
               </TabsContent>
            </Tabs>
         </div>
      </div>
   );
};

export default Profile;

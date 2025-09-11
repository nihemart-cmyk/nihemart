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
                  <TabsTrigger value="settings">Settings</TabsTrigger>
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
                        <div className="text-center py-8 text-muted-foreground">
                           <p>No recent orders found.</p>
                           <Button
                              className="mt-4"
                              variant="outline"
                           >
                              Start Shopping
                           </Button>
                        </div>
                     </CardContent>
                  </Card>
               </TabsContent>

               <TabsContent
                  value="settings"
                  className="mt-6"
               >
                  <Card>
                     <CardHeader>
                        <CardTitle>Account Settings</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="flex items-center justify-between py-4 border-b">
                           <div>
                              <h4 className="font-medium">
                                 Email Notifications
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                 Receive updates about your orders
                              </p>
                           </div>
                           <Button
                              variant="outline"
                              size="sm"
                           >
                              Configure
                           </Button>
                        </div>

                        <div className="flex items-center justify-between py-4 border-b">
                           <div>
                              <h4 className="font-medium">Change Password</h4>
                              <p className="text-sm text-muted-foreground">
                                 Update your account password
                              </p>
                           </div>
                           <Button
                              variant="outline"
                              size="sm"
                           >
                              Change
                           </Button>
                        </div>

                        <div className="flex items-center justify-between py-4">
                           <div>
                              <h4 className="font-medium">Delete Account</h4>
                              <p className="text-sm text-muted-foreground">
                                 Permanently delete your account
                              </p>
                           </div>
                           <Button
                              variant="destructive"
                              size="sm"
                           >
                              Delete
                           </Button>
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

"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateRider, useRiderByUserId } from "@/hooks/useRiders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
   Select,
   SelectTrigger,
   SelectValue,
   SelectContent,
   SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
   User,
   Phone,
   Car,
   Power,
   Save,
   RotateCcw,
   Settings as SettingsIcon,
   CheckCircle2,
   XCircle,
} from "lucide-react";

export default function RiderSettingsPage() {
   const { user } = useAuth();
   const [saving, setSaving] = useState(false);
   const { data: rider, isLoading: loading } = useRiderByUserId(user?.id);
   const update = useUpdateRider();

   const [fullName, setFullName] = React.useState("");
   const [phone, setPhone] = React.useState("");
   const [vehicle, setVehicle] = React.useState("");
   const [active, setActive] = React.useState<boolean>(false);

   // Initialize local form state from shared rider query
   useEffect(() => {
      if (!rider) return;
      setFullName(rider?.full_name || "");
      setPhone(rider?.phone || "");
      setVehicle(rider?.vehicle || "");
      setActive(!!rider?.active);
   }, [rider]);

   if (!user) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center p-4">
            <Card className="p-6 sm:p-8 text-center max-w-md w-full shadow-lg">
               <CardContent>
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <User className="w-8 h-8 text-orange-500" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">
                     Please Sign In
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                     You need to sign in to access your settings.
                  </p>
               </CardContent>
            </Card>
         </div>
      );
   }

   if (loading) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center p-4">
            <div className="text-center">
               <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
               <p className="text-gray-600">Loading your settings...</p>
            </div>
         </div>
      );
   }

   if (!rider) {
      return (
         <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center p-4">
            <Card className="p-6 sm:p-8 text-center max-w-md w-full shadow-lg">
               <CardContent>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                     <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold mb-2">
                     No Profile Found
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                     No rider profile found for your account.
                  </p>
               </CardContent>
            </Card>
         </div>
      );
   }

   const handleSave = async () => {
      setSaving(true);
      try {
         await update.mutateAsync({
            riderId: rider.id,
            updates: { full_name: fullName, phone, vehicle, active },
         });
         toast.success("Settings saved successfully");
      } catch (err: any) {
         console.error(err);
         toast.error(err?.message || "Failed to save settings");
      } finally {
         setSaving(false);
      }
   };

   const hasChanges =
      fullName !== (rider?.full_name || "") ||
      phone !== (rider?.phone || "") ||
      vehicle !== (rider?.vehicle || "") ||
      active !== !!rider?.active;

   return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
         <div className="mx-auto p-3 sm:p-4 md:p-6 ">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
               <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                     <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                     <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                        Rider Settings
                     </h1>
                     <p className="text-xs sm:text-sm text-gray-600">
                        Manage your profile and preferences
                     </p>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Profile Status Card */}
               <div className="lg:col-span-1">
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 sticky top-6">
                     <CardHeader className="pb-4">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
                           Profile Status
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-6">
                        <div className="flex items-start gap-4">
                           <div className="relative flex-shrink-0">
                              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                                 <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-orange-500" />
                                 </div>
                              </div>
                              <div
                                 className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                                    active ? "bg-green-500" : "bg-red-500"
                                 }`}
                              ></div>
                           </div>
                           <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg text-gray-900 truncate">
                                 {fullName || "Rider"}
                              </h3>
                              <p className="text-gray-500 text-sm truncate">
                                 ID: #{rider.id.slice(0, 8)}
                              </p>
                              <Badge
                                 className={`mt-2 text-xs ${
                                    active
                                       ? "bg-green-100 text-green-700 hover:bg-green-100"
                                       : "bg-red-100 text-red-700 hover:bg-red-100"
                                 }`}
                              >
                                 {active ? "Active" : "Inactive"}
                              </Badge>
                           </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                           <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">
                                 Email
                              </p>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                 {user?.email}
                              </p>
                           </div>
                           <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">
                                 Vehicle Type
                              </p>
                              <p className="text-sm font-medium text-gray-900">
                                 {vehicle || "Not set"}
                              </p>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               </div>

               {/* Settings Form */}
               <div className="lg:col-span-2">
                  <Card className="border-0 shadow-lg">
                     <CardHeader className="pb-4">
                        <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
                           Profile Information
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-6">
                        {/* Full Name */}
                        <div className="space-y-2">
                           <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500" />
                              Full Name
                           </Label>
                           <Input
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Enter your full name"
                              className="h-11 focus-visible:ring-orange-500"
                           />
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                           <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-500" />
                              Phone Number
                           </Label>
                           <Input
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="Enter your phone number"
                              type="tel"
                              className="h-11 focus-visible:ring-orange-500"
                           />
                        </div>

                        {/* Vehicle */}
                        <div className="space-y-2">
                           <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Car className="w-4 h-4 text-gray-500" />
                              Vehicle Type
                           </Label>
                           <Select
                              value={vehicle}
                              onValueChange={(v) => setVehicle(v)}
                           >
                              <SelectTrigger className="w-full h-11 focus:ring-orange-500">
                                 <SelectValue placeholder="Select vehicle type" />
                              </SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="Bike">Bike</SelectItem>
                                 <SelectItem value="Car">Car</SelectItem>
                                 <SelectItem value="Motorbike">
                                    Motorbike
                                 </SelectItem>
                                 <SelectItem value="Bicycle">
                                    Bicycle
                                 </SelectItem>
                                 <SelectItem value="Van">Van</SelectItem>
                                 <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>

                        {/* Availability Toggle */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 sm:p-5 border border-gray-200">
                           <div className="flex items-center justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                 <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                                    <Power className="w-5 h-5 text-orange-500" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 mb-1">
                                       Available for Assignments
                                    </p>
                                    <p className="text-xs text-gray-600">
                                       Toggle your availability to receive new
                                       delivery assignments
                                    </p>
                                 </div>
                              </div>
                              <span
                                 role="button"
                                 onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const newVal = !active;
                                    // optimistic UI
                                    setActive(newVal);
                                    try {
                                       await update.mutateAsync({
                                          riderId: rider.id,
                                          updates: { active: newVal },
                                       });
                                       toast.success(
                                          newVal
                                             ? "You are now available for deliveries"
                                             : "You are now unavailable for deliveries"
                                       );
                                    } catch (err: any) {
                                       // rollback
                                       setActive(!newVal);
                                       console.error(err);
                                       toast.error(
                                          err?.message ||
                                             "Failed to update availability"
                                       );
                                    }
                                 }}
                                 className="flex-shrink-0"
                              >
                                 <Switch checked={active} />
                              </span>
                           </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                           <Button
                              onClick={handleSave}
                              disabled={saving || !hasChanges}
                              className="flex-1 h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                           >
                              {saving ? (
                                 <>
                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                    Saving...
                                 </>
                              ) : (
                                 <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Save Changes
                                 </>
                              )}
                           </Button>
                           <Button
                              variant="outline"
                              onClick={() => {
                                 // reset
                                 setFullName(rider?.full_name || "");
                                 setPhone(rider?.phone || "");
                                 setVehicle(rider?.vehicle || "");
                                 setActive(!!rider?.active);
                                 toast.info("Settings reset to saved values");
                              }}
                              disabled={saving || !hasChanges}
                              className="h-11 border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto w-full"
                           >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Reset
                           </Button>
                        </div>

                        {hasChanges && (
                           <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                 <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              </div>
                              <p className="text-xs text-blue-700">
                                 You have unsaved changes. Click &quot;Save Changes&quot;
                                 to update your profile.
                              </p>
                           </div>
                        )}

                        {!hasChanges && !saving && (
                           <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                              <p className="text-xs text-green-700">
                                 All changes saved. Your profile is up to date.
                              </p>
                           </div>
                        )}
                     </CardContent>
                  </Card>
               </div>
            </div>
         </div>
      </div>
   );
}

"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchRiderByUserId } from "@/integrations/supabase/riders";
import { useUpdateRider } from "@/hooks/useRiders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function RiderSettingsPage() {
   const { user } = useAuth();
   const [rider, setRider] = useState<any | null>(null);
   const [loading, setLoading] = useState(false);
   const [saving, setSaving] = useState(false);
   const update = useUpdateRider();

   const [fullName, setFullName] = useState("");
   const [phone, setPhone] = useState("");
   const [vehicle, setVehicle] = useState("");
   const [active, setActive] = useState<boolean>(false);

   useEffect(() => {
      if (!user) return;
      setLoading(true);
      fetchRiderByUserId(user.id)
         .then((r) => {
            setRider(r);
            setFullName(r?.full_name || "");
            setPhone(r?.phone || "");
            setVehicle(r?.vehicle || "");
            setActive(!!r?.active);
         })
         .catch((e) => console.error(e))
         .finally(() => setLoading(false));
   }, [user]);

   if (!user) return <div className="p-6">Please sign in.</div>;
   if (loading) return <div className="p-6">Loading...</div>;
   if (!rider) return <div className="p-6">No rider profile found.</div>;

   const handleSave = async () => {
      setSaving(true);
      // optimistic update locally
      const prev = { ...rider };
      setRider((p: any) => ({
         ...p,
         full_name: fullName,
         phone,
         vehicle,
         active,
      }));
      try {
         await update.mutateAsync({
            riderId: rider.id,
            updates: { full_name: fullName, phone, vehicle, active },
         });
         toast.success("Settings saved");
      } catch (err: any) {
         setRider(prev);
         console.error(err);
         toast.error(err?.message || "Failed to save settings");
      } finally {
         setSaving(false);
      }
   };

   return (
      <div className="p-6">
         <h2 className="text-xl font-semibold mb-4">Rider Settings</h2>
         <div className="max-w-2xl">
            <Card>
               <CardHeader>
                  <CardTitle>Your Profile</CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  <div>
                     <Label>Full name</Label>
                     <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                     />
                  </div>
                  <div>
                     <Label>Phone</Label>
                     <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                     />
                  </div>
                  <div>
                     <Label>Vehicle</Label>
                     <Input
                        value={vehicle}
                        onChange={(e) => setVehicle(e.target.value)}
                        placeholder="e.g. Motorcycle - Yamaha"
                     />
                  </div>
                  <div className="flex items-center justify-between">
                     <div>
                        <p className="text-sm">Available for assignments</p>
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
                              toast.success("Availability updated");
                           } catch (err: any) {
                              // rollback
                              setActive(!newVal);
                              console.error(err);
                              toast.error(
                                 err?.message || "Failed to update availability"
                              );
                           }
                        }}
                     >
                        <Switch checked={active} />
                     </span>
                  </div>
                  <div className="flex gap-3">
                     <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-blue-600"
                     >
                        {saving ? "Saving..." : "Save settings"}
                     </Button>
                     <Button
                        variant="outline"
                        onClick={() => {
                           // reset
                           setFullName(rider?.full_name || "");
                           setPhone(rider?.phone || "");
                           setVehicle(rider?.vehicle || "");
                           setActive(!!rider?.active);
                        }}
                        disabled={saving}
                     >
                        Reset
                     </Button>
                  </div>
               </CardContent>
            </Card>
         </div>
      </div>
   );
}

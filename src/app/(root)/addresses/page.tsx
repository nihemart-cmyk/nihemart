"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddresses } from "@/hooks/useAddresses";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const AddressesPage = () => {
   const { user, isLoggedIn } = useAuth();
   const {
      addresses: savedAddresses,
      saved,
      selected,
      selectAddress,
      saveAddress,
      updateAddress,
      removeAddress,
      setDefaultAddress,
      refresh,
   } = useAddresses();

   const [editingId, setEditingId] = useState<string | null>(null);
   const [displayName, setDisplayName] = useState("");
   const [city, setCity] = useState("");
   const [phone, setPhone] = useState("");
   const [street, setStreet] = useState("");
   const [isSaving, setIsSaving] = useState(false);

   React.useEffect(() => {
      if (!isLoggedIn) return;
      // ensure addresses loaded
      refresh && refresh();
   }, [isLoggedIn]);

   const startEdit = (id: string) => {
      const found = (saved || []).find((a: any) => a.id === id);
      if (!found) return;
      setEditingId(id);
      setDisplayName(found.display_name || "");
      setCity(found.city || "");
      setPhone(found.phone || "");
      setStreet(found.street || "");
   };

   const handleSave = async () => {
      if (isSaving) return;
      setIsSaving(true);
      try {
         if (editingId) {
            const res = await updateAddress(editingId, {
               display_name: displayName,
               city,
               phone,
               street,
            });
            if (res) toast.success("Address updated");
            else toast.error("Failed to update address");
         } else {
            const res = await saveAddress({
               display_name: displayName || city || street || "Address",
               lat: "0",
               lon: "0",
               address: { city },
               street,
               house_number: undefined,
               phone,
               is_default: false,
            });
            if (res) toast.success("Address saved");
            else toast.error("Failed to save address");
         }
         setEditingId(null);
         setDisplayName("");
         setCity("");
         setPhone("");
         setStreet("");
         refresh && refresh();
      } catch (err) {
         toast.error("Save failed");
      }
      setIsSaving(false);
   };

   const handleDelete = async (id: string) => {
      const ok = await removeAddress(id);
      if (ok) {
         toast.success("Address removed");
         refresh && refresh();
      } else {
         toast.error("Failed to remove address");
      }
   };

   if (!isLoggedIn) {
      return (
         <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
               <h2 className="text-2xl font-bold">Please sign in</h2>
               <p className="text-muted-foreground">
                  You must be signed in to manage addresses.
               </p>
            </div>
         </div>
      );
   }

   return (
      <div className="container mx-auto px-4 py-8">
         <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Your Addresses</h1>

            <Card className="mb-6">
               <CardHeader>
                  <CardTitle>Add / Edit Address</CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="grid grid-cols-1 gap-4">
                     <div>
                        <Label className="text-sm">Display name</Label>
                        <Input
                           value={displayName}
                           onChange={(e) => setDisplayName(e.target.value)}
                        />
                     </div>
                     <div>
                        <Label className="text-sm">City</Label>
                        <Input
                           value={city}
                           onChange={(e) => setCity(e.target.value)}
                        />
                     </div>
                     <div>
                        <Label className="text-sm">Street</Label>
                        <Input
                           value={street}
                           onChange={(e) => setStreet(e.target.value)}
                        />
                     </div>
                     <div>
                        <Label className="text-sm">Phone</Label>
                        <Input
                           value={phone}
                           onChange={(e) => setPhone(e.target.value)}
                        />
                     </div>

                     <div className="flex gap-2">
                        <Button
                           onClick={handleSave}
                           disabled={isSaving}
                        >
                           {editingId ? "Update" : "Save"}
                        </Button>
                        <Button
                           variant="outline"
                           onClick={() => {
                              setEditingId(null);
                              setDisplayName("");
                              setCity("");
                              setPhone("");
                              setStreet("");
                           }}
                        >
                           Cancel
                        </Button>
                     </div>
                  </div>
               </CardContent>
            </Card>

            <div className="space-y-4">
               {(saved || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                     No saved addresses
                  </div>
               ) : (
                  (saved || []).map((addr: any) => (
                     <Card key={addr.id}>
                        <CardContent className="flex justify-between items-center">
                           <div>
                              <div className="font-medium">
                                 {addr.display_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                 {addr.street} {addr.city}
                              </div>
                              {addr.phone && (
                                 <div className="text-sm text-blue-600">
                                    {addr.phone}
                                 </div>
                              )}
                           </div>
                           <div className="flex items-center gap-2">
                              <Button
                                 size="sm"
                                 onClick={() => startEdit(addr.id)}
                              >
                                 Edit
                              </Button>
                              <Button
                                 size="sm"
                                 variant="outline"
                                 onClick={() => handleDelete(addr.id)}
                              >
                                 Delete
                              </Button>
                              <Button
                                 size="sm"
                                 variant="ghost"
                                 onClick={() => {
                                    selectAddress(addr.id);
                                    toast.success("Selected");
                                 }}
                              >
                                 Select
                              </Button>
                              <Button
                                 size="sm"
                                 variant="secondary"
                                 onClick={() =>
                                    setDefaultAddress &&
                                    setDefaultAddress(addr.id)
                                 }
                              >
                                 Set default
                              </Button>
                           </div>
                        </CardContent>
                     </Card>
                  ))
               )}
            </div>
         </div>
      </div>
   );
};

export default AddressesPage;

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
   Select,
   SelectTrigger,
   SelectValue,
   SelectContent,
   SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { Loader2, User, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

const NewRiderPage = () => {
   const router = useRouter();
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [fullName, setFullName] = useState("");
   const [phone, setPhone] = useState("");
   const [vehicle, setVehicle] = useState("");
   const [active, setActive] = useState(true);
   const [notes, setNotes] = useState("");
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState("");
   const [message, setMessage] = useState("");

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setMessage("");

      if (loading) return;

      if (!email || !password) {
         setError("Email and password are required to create a rider account");
         return;
      }

      setLoading(true);
      try {
         const res = await fetch("/api/admin/create-rider", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
               full_name: fullName,
               phone,
               vehicle,
               email,
               password,
               active,
               notes,
            }),
         });

         const data = await res.json();
         if (!res.ok) {
            const err = data?.error || "Failed to create rider";
            setError(err);
            toast.error(err);
            setLoading(false);
            return;
         }

         setMessage(
            "Rider created successfully. Rider can sign in with the email and password provided."
         );
         toast.success("Rider created");
         // reset
         setEmail("");
         setPassword("");
         setFullName("");
         setPhone("");
         setVehicle("");

         // redirect back to riders list
         setTimeout(() => router.push("/admin/riders"), 1200);
      } catch (err: any) {
         console.error(err);
         const msg = err?.message || "Failed to create rider";
         setError(msg);
         toast.error(msg);
      } finally {
         setLoading(false);
      }
   };

   return (
      <ScrollArea className="h-[calc(100vh-5rem)]">
         <div className="p-6 w-full mx-auto">
            <div className="mb-4">
               <Link
                  href="/admin/riders"
                  className="text-orange-500"
               >
                  ← Back to riders
               </Link>
            </div>

            <form onSubmit={handleSubmit}>
               <div className="flex justify-between items-center mb-6">
                  <h1 className="text-2xl font-semibold">Create Rider</h1>
                  <div>
                     <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push("/admin/riders")}
                        disabled={loading}
                     >
                        Cancel
                     </Button>
                  </div>
               </div>

               <div className="space-y-6">
                  {message && (
                     <Alert className="border-green-200 bg-green-50">
                        <AlertDescription className="text-green-800">
                           {message}
                        </AlertDescription>
                     </Alert>
                  )}
                  {error && (
                     <Alert className="border-red-200 bg-red-50">
                        <AlertDescription className="text-red-800">
                           {error}
                        </AlertDescription>
                     </Alert>
                  )}

                  <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <User className="h-5 w-5" /> Rider Account
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <Label>Email *</Label>
                              <Input
                                 value={email}
                                 onChange={(e) => setEmail(e.target.value)}
                                 placeholder="rider@example.com"
                                 required
                                 disabled={loading}
                              />
                           </div>
                           <div>
                              <Label>Password *</Label>
                              <Input
                                 type="password"
                                 value={password}
                                 onChange={(e) => setPassword(e.target.value)}
                                 placeholder="password (min 6 chars)"
                                 required
                                 disabled={loading}
                              />
                           </div>
                        </div>
                     </CardContent>
                  </Card>

                  <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <User className="h-5 w-5" /> Rider Details
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <Label>Full Name</Label>
                              <Input
                                 value={fullName}
                                 onChange={(e) => setFullName(e.target.value)}
                                 placeholder="Full name"
                                 disabled={loading}
                              />
                           </div>
                           <div>
                              <Label>Phone</Label>
                              <div className="relative">
                                 <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                 <Input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="pl-10"
                                    placeholder="Phone number"
                                    disabled={loading}
                                 />
                              </div>

                              <div>
                                 <Label>Active</Label>
                                 <div className="mt-2">
                                    <Switch
                                       checked={active}
                                       onCheckedChange={(v) => setActive(!!v)}
                                    />
                                 </div>
                              </div>

                              <div>
                                 <Label>Notes</Label>
                                 <Input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Optional notes about rider"
                                 />
                              </div>
                           </div>
                        </div>

                        <div>
                           <Label>Vehicle</Label>
                           <Select
                              value={vehicle}
                              onValueChange={(val) => setVehicle(val)}
                           >
                              <SelectTrigger
                                 className="w-full"
                                 disabled={loading}
                              >
                                 <SelectValue placeholder="Bike / Car / etc" />
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
                                 <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>
                     </CardContent>
                  </Card>

                  <div className="flex justify-end gap-3">
                     <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.push("/admin/riders")}
                        disabled={loading}
                     >
                        Cancel
                     </Button>
                     <Button
                        type="submit"
                        disabled={loading}
                        className="bg-orange-600 hover:bg-orange-700"
                     >
                        {loading ? (
                           <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                           </>
                        ) : (
                           "Create Rider"
                        )}
                     </Button>
                  </div>
               </div>
            </form>
         </div>
      </ScrollArea>
   );
};

export default NewRiderPage;

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CreateOrderRequest } from "@/types/orders";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/useOrders";
import { useCart } from "@/contexts/CartContext";
// Address dialog removed; address form will live inside the collapsible
import {
   Collapsible,
   CollapsibleTrigger,
   CollapsibleContent,
} from "@/components/ui/collapsible";
import { useAddresses } from "@/hooks/useAddresses";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";

// Location data (local JSON)
import provincesJson from "@/lib/data/provinces.json";
import districtsJson from "@/lib/data/districts.json";
import sectorsJson from "@/lib/data/sectors.json";
import cellsJson from "@/lib/data/cells.json";
import sectorsFees from "@/lib/data/sectors_fees.json";
import {
   Loader2,
   ShoppingCart,
   CheckCircle2,
   MapPin,
   Package,
   CreditCard,
   ChevronDown,
   ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface CartItem {
   id: string;
   name: string;
   price: number;
   quantity: number;
   sku?: string;
   variation_id?: string;
   variation_name?: string;
}

const Checkout = () => {
   const { t } = useLanguage();
   const { user, isLoggedIn } = useAuth();
   const { createOrder } = useOrders();
   const router = useRouter();

   const [formData, setFormData] = useState({
      email: "",
      firstName: "",
      lastName: "",
      address: "",
      city: "",
      phone: "",
      delivery_notes: "",
   });
   const [orderItems, setOrderItems] = useState<CartItem[]>([]);
   const [errors, setErrors] = useState<any>({});

   // zod schema for address add/edit form (minimal: phone required)
   const phoneSchema = z.object({
      phone: z
         .string()
         .nonempty({
            message: t("checkout.errors.phoneRequired") || "Phone is required",
         })
         .refine(
            (val) => {
               // Basic Rwanda phone normalization: accept numbers with or without +250, spaces or dashes
               const cleaned = val.replace(/[^0-9]/g, "");
               // Accept if local 9 digits (starts with 7 or 3?) or with country code 12 digits (2507...)
               return (
                  /^0?7\d{8}$/.test(cleaned) ||
                  /^2507\d{8}$/.test(cleaned) ||
                  /^\+2507\d{8}$/.test(val)
               );
            },
            {
               message:
                  t("checkout.errors.validPhone") ||
                  "Please enter a valid phone number",
            }
         ),
   });
   const [isSubmitting, setIsSubmitting] = useState(false);
   // address dialog removed; we now use collapsible to add/manage addresses
   const [addressOpen, setAddressOpen] = useState(false);
   // Add-new-address collapsible
   const [addNewOpen, setAddNewOpen] = useState(false);
   const [instructionsOpen, setInstructionsOpen] = useState(false);
   const [paymentOpen, setPaymentOpen] = useState(false);

   const {
      saved: savedAddresses,
      selected: selectedAddress,
      selectAddress,
      saveAddress,
      updateAddress,
      removeAddress,
      reloadSaved,
   } = useAddresses();

   const { items: cartItems, clearCart } = useCart();

   // Location data state
   const [provinces, setProvinces] = useState<any[]>([]);
   const [districts, setDistricts] = useState<any[]>([]);
   const [sectors, setSectors] = useState<any[]>([]);
   const [cells, setCells] = useState<any[]>([]);

   // Selected location ids
   const [selectedProvince, setSelectedProvince] = useState<string | null>(
      null
   );
   const [selectedDistrict, setSelectedDistrict] = useState<string | null>(
      null
   );
   const [selectedSector, setSelectedSector] = useState<string | null>(null);
   const [selectedCell, setSelectedCell] = useState<string | null>(null);

   // Address form fields for new/edit
   const [houseNumber, setHouseNumber] = useState<string>("");
   const [phoneInput, setPhoneInput] = useState<string>("");
   const [editingAddressId, setEditingAddressId] = useState<string | null>(
      null
   );
   const [isSavingAddress, setIsSavingAddress] = useState(false);

   // Normalize phone to E.164 (basic): convert local numbers like 0784123456 or 784123456 to +250784123456
   const normalizePhone = (raw: string) => {
      if (!raw) return raw;
      const trimmed = raw.trim();
      // Remove spaces, dashes, parentheses
      const digits = trimmed.replace(/[^0-9+]/g, "");
      // If already starts with + and country code, ensure it's in +250 format
      if (digits.startsWith("+")) return digits;
      // If starts with 250 (country code without +)
      if (digits.startsWith("250") && digits.length === 12) return `+${digits}`;
      // If starts with leading zero local format e.g., 0784xxxxxx
      if (digits.startsWith("0") && digits.length === 10) {
         return `+250${digits.slice(1)}`;
      }
      // If it's 9 digits local without leading zero
      if (digits.length === 9) return `+250${digits}`;
      // fallback: return original cleaned digits
      return digits;
   };
   // (display name removed; we'll derive display_name when saving)

   useEffect(() => {
      try {
         const addr = (
            selectedAddress?.street ||
            formData.address ||
            ""
         ).trim();
         const cityEmpty = !formData.city || !formData.city.trim();
         if (!addr || !cityEmpty) return;

         const parts = addr
            .split(",")
            .map((p: string) => p.trim())
            .filter(Boolean);
         if (parts.length >= 2) {
            // Prefer the second-to-last segment as city (addresses often are "street, city, country")
            const possibleCity =
               parts.length >= 2 ? parts[parts.length - 2] : parts[0];
            if (possibleCity && possibleCity.length > 1) {
               setFormData((prev) => ({ ...prev, city: possibleCity }));
               return;
            }
         }

         // Fallback: simple keyword checks
         if (/kigali/i.test(addr)) {
            setFormData((prev) => ({ ...prev, city: "Kigali" }));
         }
      } catch (err) {
         console.error("Auto-fill city error:", err);
      }
   }, [formData.address, selectedAddress]);

   // Keep local orderItems in sync with cart context (single source of truth)
   useEffect(() => {
      try {
         if (Array.isArray(cartItems)) {
            const cleaned = cartItems.map((item: any) => ({
               ...item,
               id:
                  typeof item.id === "string"
                     ? item.id.replace(/-$/, "")
                     : item.id,
               variation_id:
                  typeof item.product_variation_id === "string"
                     ? item.product_variation_id.replace(/-$/, "")
                     : item.variation_id || item.product_variation_id,
            }));
            setOrderItems(cleaned);
         }
      } catch (err) {
         console.error("Error syncing cart items:", err);
      }

      // Pre-fill user data if logged in
      if (user) {
         setFormData((prev) => ({
            ...prev,
            email: user.email || "",
            firstName: user.user_metadata?.full_name?.split(" ")[0] || "",
            lastName:
               user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ||
               "",
         }));
      }
   }, [cartItems, user]);

   // Load location data from JSON imports and normalize to the "data" arrays
   useEffect(() => {
      try {
         const extract = (j: any, namePart: string) => {
            if (!j) return [];
            if (Array.isArray(j)) {
               const table = j.find(
                  (x) => x.type === "table" && x.name?.includes(namePart)
               );
               return table?.data || [];
            }
            // in case file already exports the table object
            if (j.type === "table" && j.data) return j.data;
            return [];
         };

         setProvinces(extract(provincesJson, "1_provinces"));
         setDistricts(extract(districtsJson, "2_districts"));
         setSectors(extract(sectorsJson, "3_sectors"));
         setCells(extract(cellsJson, "4_cells"));
      } catch (err) {
         console.error("Failed to load location data:", err);
      }
   }, []);

   // Update dependent lists when selections change
   useEffect(() => {
      if (!selectedProvince) return;
      const filteredDistricts = districts.filter(
         (d) => d.dst_province === selectedProvince
      );
      // clear downstream selections
      setSelectedDistrict(null);
      setSelectedSector(null);
      setSelectedCell(null);
      setDistricts((prev) => prev); // keep master list; filtered used in render
   }, [selectedProvince]);

   useEffect(() => {
      if (!selectedDistrict) return;
      const filteredSectors = sectors.filter(
         (s) => s.sct_district === selectedDistrict
      );
      setSelectedSector(null);
      setSelectedCell(null);
      setSectors((prev) => prev); // keep master list; filtered used in render
   }, [selectedDistrict]);

   useEffect(() => {
      if (!selectedSector) return;
      setSelectedCell(null);
      setCells((prev) => prev); // keep master list; filtered used in render
   }, [selectedSector]);

   // Redirect if cart is empty
   useEffect(() => {
      if (orderItems.length === 0) {
         const timer = setTimeout(() => {
            router.push("/");
         }, 3000);
         return () => clearTimeout(timer);
      }
   }, [orderItems.length, router]);

   const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
   );
   // Delivery fee depends on selected sector name (from sectors list) -> lookup sectorsFees
   const selectedSectorObj = sectors.find((s) => s.sct_id === selectedSector);
   const sectorFee = selectedSectorObj
      ? (sectorsFees as any)[selectedSectorObj.sct_name]
      : undefined;
   const transport = sectorFee ?? 1700; // fallback if no sector chosen
   const total = subtotal + transport;

   // Determine if the selected location (either explicit province selection or selected saved address) is Kigali
   const selectedProvinceObj = provinces.find(
      (p) => String(p.prv_id) === String(selectedProvince)
   );
   const isKigaliByProvince = Boolean(
      selectedProvinceObj?.prv_name?.toLowerCase().includes("kigali")
   );
   const isKigaliBySavedAddress = Boolean(
      selectedAddress &&
         [
            selectedAddress.city,
            selectedAddress.street,
            selectedAddress.display_name,
         ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes("kigali")
   );
   const isKigali = isKigaliByProvince || isKigaliBySavedAddress;

   // Helper to display province label localized via translations when available
   const getProvinceLabel = (p: any) => {
      const raw = String(p?.prv_name || "").toLowerCase();
      // common mappings
      if (
         raw.includes("south") ||
         raw.includes("majyepfo") ||
         raw.includes("amajyepfo")
      )
         return t("province.south");
      if (
         raw.includes("north") ||
         raw.includes("amajyaruguru") ||
         raw.includes("amajyaruguru")
      )
         return t("province.north");
      if (raw.includes("east") || raw.includes("iburasirazuba"))
         return t("province.east");
      if (raw.includes("west") || raw.includes("iburengerazuba"))
         return t("province.west");
      // try a direct translation key based on slug
      const slug = raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      const tryKey = `province.${slug}`;
      const resolved = t(tryKey);
      if (resolved !== tryKey) return resolved;
      // fallback to original name
      return p?.prv_name || tryKey;
   };

   // Form validation
   const validateForm = () => {
      const formErrors: any = {};
      const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

      if (!formData.firstName.trim())
         formErrors.firstName =
            t("checkout.errors.firstNameRequired") || "First name is required";
      if (!formData.lastName.trim())
         formErrors.lastName =
            t("checkout.errors.lastNameRequired") || "Last name is required";
      if (!formData.email.trim() || !emailPattern.test(formData.email)) {
         formErrors.email =
            t("checkout.errors.validEmailRequired") ||
            "Please enter a valid email";
      }
      // If a saved address is selected, treat it as a valid address
      const hasAddressValue =
         (formData.address && formData.address.trim()) || selectedAddress;
      if (!hasAddressValue)
         formErrors.address =
            t("checkout.errors.addressRequired") ||
            "Delivery address is required";
      if (!formData.city.trim())
         formErrors.city =
            t("checkout.errors.cityRequired") || "City is required";

      return formErrors;
   };

   // Handle order creation
   const handleCreateOrder = async () => {
      // Prevent multiple submissions
      if (isSubmitting) return;

      console.log("handleCreateOrder invoked", {
         isSubmitting,
         formData,
         orderItems,
      });

      const formErrors = validateForm();
      if (Object.keys(formErrors).length > 0) {
         setErrors(formErrors);
         // Provide immediate user feedback so clicking doesn't feel like a no-op
         const msgs = Object.values(formErrors).filter(Boolean);
         if (msgs.length > 0) {
            toast.error(String(msgs[0]));
         } else {
            toast.error("Please fix the highlighted errors and try again.");
         }
         return;
      }

      if (!isLoggedIn) {
         toast.error(t("checkout.loginToPlaceOrder"));
         router.push("/signin?redirect=/checkout");
         return;
      }

      if (orderItems.length === 0) {
         toast.error(t("cart.empty"));
         return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
         const orderData: CreateOrderRequest = {
            order: {
               user_id: user!.id,
               subtotal: subtotal,
               tax: transport,
               total: total,
               customer_email: formData.email.trim(),
               customer_first_name: formData.firstName.trim(),
               customer_last_name: formData.lastName.trim(),
               // Prefer selected saved address values when present
               customer_phone:
                  (selectedAddress?.phone || formData.phone || "").trim() ||
                  undefined,
               delivery_address: (
                  selectedAddress?.street ??
                  selectedAddress?.display_name ??
                  formData.address ??
                  ""
               ).trim(),
               delivery_city: (
                  selectedAddress?.city ||
                  formData.city ||
                  ""
               ).trim(),
               status: "pending" as const,
            },
            items: orderItems.map((item) => {
               // Prefer explicit product_id stored on the cart item.
               // Fallback: if `id` was generated as `${product_id}-${product_variation_id}`
               // we can recover product_id by taking the first 36 chars (UUID length).
               const explicitProductId = (item as any).product_id as
                  | string
                  | undefined;
               let resolvedProductId: string | undefined = explicitProductId;
               if (!resolvedProductId && typeof item.id === "string") {
                  const idStr = item.id as string;
                  if (idStr.length === 36) {
                     resolvedProductId = idStr;
                  } else if (idStr.length >= 73 && idStr[36] === "-") {
                     // pattern: <36 chars uuid>-<36 chars uuid>
                     resolvedProductId = idStr.slice(0, 36);
                  } else {
                     // last resort: leave id as-is (may be legacy or SKU)
                     resolvedProductId = idStr;
                  }
               }

               const product_id = resolvedProductId ?? String(item.id);

               return {
                  product_id: product_id,
                  product_variation_id: item.variation_id ?? undefined,
                  product_name: item.name,
                  product_sku: item.sku ?? undefined,
                  variation_name: item.variation_name ?? undefined,
                  price: item.price,
                  quantity: item.quantity,
                  total: item.price * item.quantity,
               };
            }),
         };

         console.log(
            "Order data being sent:",
            JSON.stringify(orderData, null, 2)
         );

         // include delivery instructions if provided
         if (formData.delivery_notes) {
            orderData.order.delivery_notes = formData.delivery_notes;
         }

         // Use mutate with callbacks so React Query handles async and we reliably observe network activity
         if (!createOrder || typeof createOrder.mutate !== "function") {
            console.error("createOrder mutation is not available", createOrder);
            toast.error(
               "Unable to submit order right now. Please try again later."
            );
            setIsSubmitting(false);
            return;
         }

         createOrder.mutate(orderData as CreateOrderRequest, {
            onSuccess: (createdOrder: any) => {
               console.log("createOrder.onSuccess", createdOrder);
               // Clear cart only after successful order creation (use context)
               try {
                  clearCart();
               } catch (e) {
                  // fallback
                  localStorage.removeItem("cart");
               }
               setOrderItems([]); // Clear local state too

               toast.success(
                  `Order #${createdOrder.order_number} has been created successfully!`
               );

               // Redirect to order details page
               router.push(`/orders/${createdOrder.id}`);
            },
            onError: (error: any) => {
               console.error("createOrder.onError", error);
               // More specific error handling
               if (error?.message?.includes("uuid")) {
                  toast.error(
                     "Invalid product data. Please refresh and try again."
                  );
               } else if (error?.message?.includes("foreign key")) {
                  toast.error(
                     "Product no longer available. Please update your cart."
                  );
               } else {
                  toast.error(
                     `Failed to create order: ${
                        error?.message || "Unknown error"
                     }`
                  );
               }
            },
            onSettled: () => {
               setIsSubmitting(false);
            },
         });
      } catch (error: any) {
         console.error("Order creation failed (sync):", error);
         // fallback error feedback
         toast.error(
            `Failed to create order: ${error?.message || "Unknown error"}`
         );
         setIsSubmitting(false);
      }
   };

   // Function to generate the WhatsApp message (fallback)
   const generateWhatsAppMessage = () => {
      const productDetails = orderItems
         .map(
            (item) =>
               `${item.name}${
                  item.variation_name ? ` (${item.variation_name})` : ""
               } x${item.quantity} - ${(
                  item.price * item.quantity
               ).toLocaleString()} RWF`
         )
         .join("\n");

      const message = `
*New Order Request*

*Customer Details:*
Name: ${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Phone: ${formData.phone}
Address: ${formData.address}, ${formData.city}

*Products:*
${productDetails}

*Order Summary:*
Subtotal: ${subtotal.toLocaleString()} RWF
Transport: ${transport.toLocaleString()} RWF
Total: ${total.toLocaleString()} RWF
    `;
      return encodeURIComponent(message);
   };

   const handleWhatsAppCheckout = () => {
      const formErrors = validateForm();
      if (Object.keys(formErrors).length > 0) {
         setErrors(formErrors);
         return;
      }

      if (orderItems.length === 0) {
         toast.error("Your cart is empty");
         return;
      }

      const phoneNumber = "250784148374";
      const message = generateWhatsAppMessage();
      const url = `https://wa.me/${phoneNumber}?text=${message}`;
      window.open(url, "_blank");
   };

   // Show empty cart message
   if (orderItems.length === 0) {
      return (
         <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
               <ShoppingCart className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
               <h1 className="text-3xl font-bold mb-4">
                  {t("checkout.cartEmptyTitle")}
               </h1>
               <p className="text-muted-foreground mb-8">
                  {t("checkout.cartEmptyInfo")}
               </p>
               <Button onClick={() => router.push("/")}>
                  {t("checkout.continueShopping")}
               </Button>
            </div>
         </div>
      );
   }

   return (
      <div className="container mx-auto px-4 py-8">
         <h1 className="text-4xl font-extrabold tracking-tight mb-8">
            {t("checkout.title")}
         </h1>

         <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-6">
               {/* Add delivery address section */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-3">
                        <MapPin className="h-5 w-5 text-gray-600" />
                        <h2 className="text-lg font-medium">
                           {t("checkout.addDeliveryAddress")}
                        </h2>
                     </div>
                     <Button
                        onClick={() => {
                           // Open the Add New Address collapsible and close the saved-addresses collapsible
                           setAddNewOpen(true);
                           setAddressOpen(false);
                           // Reset selection so selects show sequentially
                           setSelectedProvince(null);
                           setSelectedDistrict(null);
                           setSelectedSector(null);
                           setSelectedCell(null);
                           // Reset form fields
                           setHouseNumber("");
                           setPhoneInput("");
                           setEditingAddressId(null);
                        }}
                        size="sm"
                        variant="outline"
                        className="border border-gray-300 text-gray-700 hover:bg-gray-50"
                     >
                        {t("checkout.addNewAddress")}
                     </Button>
                  </div>

                  {/* Add New Address (collapsible) - shows selects sequentially and form */}
                  <Collapsible
                     open={addNewOpen}
                     onOpenChange={setAddNewOpen}
                  >
                     <CollapsibleTrigger asChild>
                        <div className="mt-3">
                           {/* visually nothing here; the Add button controls opening */}
                        </div>
                     </CollapsibleTrigger>
                     <CollapsibleContent className="mt-4">
                        <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
                           <div className="text-sm font-medium">
                              {t("checkout.addNewAddress")}
                           </div>

                           {/* Sequential selects: only show next select after previous is chosen */}
                           <div className="space-y-2">
                              <Label className="text-sm">
                                 Province{" "}
                                 <span className="text-red-500">*</span>
                              </Label>
                              <Select
                                 value={selectedProvince ?? ""}
                                 onValueChange={(v) =>
                                    setSelectedProvince(v || null)
                                 }
                              >
                                 <SelectTrigger>
                                    <SelectValue
                                       placeholder={t(
                                          "checkout.selectProvincePlaceholder"
                                       )}
                                    />
                                 </SelectTrigger>
                                 <SelectContent>
                                    {provinces.map((p: any) => (
                                       <SelectItem
                                          key={p.prv_id}
                                          value={String(p.prv_id)}
                                       >
                                          {getProvinceLabel(p)}
                                       </SelectItem>
                                    ))}
                                 </SelectContent>
                              </Select>
                           </div>

                           {selectedProvince && (
                              <div className="space-y-2">
                                 <Label className="text-sm">
                                    District{" "}
                                    <span className="text-red-500">*</span>
                                 </Label>
                                 <Select
                                    value={selectedDistrict ?? ""}
                                    onValueChange={(v) =>
                                       setSelectedDistrict(v || null)
                                    }
                                 >
                                    <SelectTrigger>
                                       <SelectValue
                                          placeholder={t(
                                             "checkout.selectDistrictPlaceholder"
                                          )}
                                       />
                                    </SelectTrigger>
                                    <SelectContent>
                                       {districts
                                          .filter(
                                             (d: any) =>
                                                d.dst_province ===
                                                selectedProvince
                                          )
                                          .map((d: any) => (
                                             <SelectItem
                                                key={d.dst_id}
                                                value={String(d.dst_id)}
                                             >
                                                {d.dst_name}
                                             </SelectItem>
                                          ))}
                                    </SelectContent>
                                 </Select>
                              </div>
                           )}

                           {selectedDistrict && (
                              <div className="space-y-2">
                                 <Label className="text-sm">
                                    Sector{" "}
                                    <span className="text-red-500">*</span>
                                 </Label>
                                 <Select
                                    value={selectedSector ?? ""}
                                    onValueChange={(v) =>
                                       setSelectedSector(v || null)
                                    }
                                 >
                                    <SelectTrigger>
                                       <SelectValue
                                          placeholder={t(
                                             "checkout.selectSectorPlaceholder"
                                          )}
                                       />
                                    </SelectTrigger>
                                    <SelectContent>
                                       {sectors
                                          .filter(
                                             (s: any) =>
                                                s.sct_district ===
                                                selectedDistrict
                                          )
                                          .map((s: any) => (
                                             <SelectItem
                                                key={s.sct_id}
                                                value={String(s.sct_id)}
                                             >
                                                {s.sct_name}
                                             </SelectItem>
                                          ))}
                                    </SelectContent>
                                 </Select>
                              </div>
                           )}

                           {selectedSector && (
                              <div className="space-y-2">
                                 <Label className="text-sm">
                                    Cell <span className="text-red-500">*</span>
                                 </Label>
                                 <Select
                                    value={selectedCell ?? ""}
                                    onValueChange={(v) =>
                                       setSelectedCell(v || null)
                                    }
                                 >
                                    <SelectTrigger>
                                       <SelectValue
                                          placeholder={t(
                                             "checkout.selectCellPlaceholder"
                                          )}
                                       />
                                    </SelectTrigger>
                                    <SelectContent>
                                       {cells
                                          .filter(
                                             (c: any) =>
                                                c.cel_sector === selectedSector
                                          )
                                          .map((c: any) => (
                                             <SelectItem
                                                key={c.cel_id}
                                                value={String(c.cel_id)}
                                             >
                                                {c.cel_name}
                                             </SelectItem>
                                          ))}
                                    </SelectContent>
                                 </Select>
                              </div>
                           )}

                           {/* Show computed delivery fee */}
                           <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-700">
                                 {t("checkout.deliveryFee")}
                              </div>
                              <div className="text-sm font-semibold">
                                 RWF {transport.toLocaleString()}
                              </div>
                           </div>

                           {/* Add/Edit form (always visible inside Add New Address) */}
                           <div className="pt-2">
                              <div className="flex items-center justify-between">
                                 <div className="text-sm font-medium">
                                    {t("checkout.otherInfo")}
                                 </div>
                              </div>

                              <div className="mt-2 space-y-2">
                                 <div>
                                    <label className="text-sm font-medium">
                                       {t("checkout.houseStreet")}
                                    </label>
                                    <Input
                                       placeholder={t(
                                          "checkout.houseStreetPlaceholder"
                                       )}
                                       value={houseNumber}
                                       onChange={(e) =>
                                          setHouseNumber(e.target.value)
                                       }
                                    />
                                 </div>
                                 <div>
                                    <label className="text-sm font-medium">
                                       {t("checkout.phone")}{" "}
                                       <span className="text-red-500">*</span>
                                    </label>
                                    <div>
                                       <Input
                                          placeholder={t(
                                             "checkout.phonePlaceholder"
                                          )}
                                          value={phoneInput}
                                          onChange={(e) => {
                                             setPhoneInput(e.target.value);
                                             // clear inline phone error as user types
                                             setErrors((prev: any) => ({
                                                ...prev,
                                                phone: undefined,
                                             }));
                                          }}
                                       />
                                       {errors?.phone && (
                                          <p className="text-xs text-red-600 mt-1">
                                             {errors.phone}
                                          </p>
                                       )}
                                    </div>
                                 </div>

                                 <div className="flex space-x-2">
                                    <Button
                                       onClick={async () => {
                                          if (isSavingAddress) return;
                                          // Save or update
                                          if (!selectedSector) {
                                             toast.error(
                                                "Please select a sector for delivery"
                                             );
                                             return;
                                          }
                                          // prevent double-clicks
                                          setIsSavingAddress(true);
                                          // validate phone with zod
                                          try {
                                             phoneSchema.parse({
                                                phone: phoneInput,
                                             });
                                          } catch (ve: any) {
                                             const first =
                                                ve?.errors?.[0]?.message ||
                                                t("checkout.errors.validPhone");
                                             setErrors((prev: any) => ({
                                                ...prev,
                                                phone: first,
                                             }));
                                             toast.error(String(first));
                                             setIsSavingAddress(false);
                                             return;
                                          }
                                          const sectorObj = sectors.find(
                                             (s) => s.sct_id === selectedSector
                                          );
                                          const cityName =
                                             sectorObj?.sct_name || "";
                                          // Derive a display name from selected names (sector/cell) since displayName field removed
                                          const derivedDisplayName = (() => {
                                             if (selectedCell) {
                                                const foundCell = cells.find(
                                                   (c) =>
                                                      c.cel_id === selectedCell
                                                );
                                                if (foundCell)
                                                   return `${foundCell.cel_name} address`;
                                             }
                                             if (sectorObj)
                                                return `${sectorObj.sct_name} address`;
                                             return "Address";
                                          })();
                                          try {
                                             const normalizedPhone =
                                                normalizePhone(phoneInput);

                                             if (editingAddressId) {
                                                const updated =
                                                   await updateAddress(
                                                      editingAddressId,
                                                      {
                                                         display_name:
                                                            derivedDisplayName,
                                                         street: cityName,
                                                         house_number:
                                                            houseNumber,
                                                         phone: normalizedPhone,
                                                         city: cityName,
                                                      }
                                                   );
                                                if (updated)
                                                   toast.success(
                                                      t(
                                                         "checkout.updatedSuccess"
                                                      )
                                                   );
                                                else
                                                   toast.error(
                                                      t("checkout.updateFailed")
                                                   );
                                             } else {
                                                const saved = await saveAddress(
                                                   {
                                                      display_name:
                                                         derivedDisplayName,
                                                      lat: "0",
                                                      lon: "0",
                                                      address: {
                                                         city: cityName,
                                                      },
                                                      street: cityName,
                                                      house_number: houseNumber,
                                                      phone: normalizedPhone,
                                                      is_default: false,
                                                   }
                                                );
                                                if (saved)
                                                   toast.success(
                                                      t("checkout.savedSuccess")
                                                   );
                                                else
                                                   toast.error(
                                                      t("checkout.saveFailed")
                                                   );
                                             }
                                             // refresh list and switch UI: close Add New, open Select Address
                                             await reloadSaved();
                                             // close the Add New collapsible and open the Select Delivery Address
                                             setAddNewOpen(false);
                                             setAddressOpen(true);
                                             setEditingAddressId(null);
                                             // clear form
                                             setHouseNumber("");
                                             setPhoneInput("");
                                          } catch (err) {
                                             console.error(err);
                                             toast.error(
                                                t("checkout.saveFailed")
                                             );
                                             setIsSavingAddress(false);
                                          }

                                          // final cleanup: ensure button re-enabled
                                          setIsSavingAddress(false);
                                       }}
                                       disabled={isSavingAddress}
                                       aria-busy={isSavingAddress}
                                    >
                                       {t("common.save")}
                                    </Button>
                                    <Button
                                       variant="outline"
                                       onClick={() => {
                                          setEditingAddressId(null);
                                          setHouseNumber("");
                                          setPhoneInput("");
                                       }}
                                    >
                                       {t("common.cancel")}
                                    </Button>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </CollapsibleContent>
                  </Collapsible>

                  {/* Select delivery address (separate collapsible) */}
                  <Collapsible
                     open={addressOpen}
                     onOpenChange={setAddressOpen}
                  >
                     <CollapsibleTrigger asChild>
                        <button className="w-full text-left p-0 flex items-center space-x-2 text-gray-600 hover:text-gray-800">
                           {addressOpen ? (
                              <ChevronDown className="h-4 w-4" />
                           ) : (
                              <ChevronRight className="h-4 w-4" />
                           )}
                           <span className="text-sm">
                              {t("checkout.selectDeliveryAddress")}
                           </span>
                        </button>
                     </CollapsibleTrigger>
                     <CollapsibleContent className="mt-4">
                        <div className="border rounded-lg p-4 bg-gray-50">
                           {savedAddresses && savedAddresses.length > 0 ? (
                              <div className="space-y-3">
                                 {savedAddresses.map((addr) => (
                                    <div
                                       key={addr.id}
                                       role="button"
                                       tabIndex={0}
                                       onClick={() => {
                                          selectAddress(addr.id);
                                          // try set selectedSector by matching known fields
                                          const foundSector = sectors.find(
                                             (s) =>
                                                s.sct_name === addr.street ||
                                                s.sct_name ===
                                                   addr.display_name ||
                                                s.sct_name === addr.city
                                          );
                                          if (foundSector) {
                                             setSelectedSector(
                                                foundSector.sct_id
                                             );
                                             setSelectedDistrict(
                                                foundSector.sct_district
                                             );
                                             const foundDistrict =
                                                districts.find(
                                                   (d) =>
                                                      d.dst_id ===
                                                      foundSector.sct_district
                                                );
                                             if (foundDistrict)
                                                setSelectedProvince(
                                                   foundDistrict.dst_province
                                                );
                                          }
                                          // Use the first segment (usually street) for the address field
                                          const streetOrName =
                                             addr.street ??
                                             addr.display_name ??
                                             "";
                                          const firstSegment =
                                             streetOrName
                                                .split(",")
                                                .map((p) => p.trim())
                                                .filter(Boolean)[0] ||
                                             streetOrName;
                                          setFormData((prev) => ({
                                             ...prev,
                                             address:
                                                firstSegment || prev.address,
                                             city: addr.city ?? prev.city,
                                             phone: addr.phone ?? prev.phone,
                                          }));
                                       }}
                                       onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                             selectAddress(addr.id);
                                             const foundSector = sectors.find(
                                                (s) =>
                                                   s.sct_name === addr.street ||
                                                   s.sct_name ===
                                                      addr.display_name ||
                                                   s.sct_name === addr.city
                                             );
                                             if (foundSector) {
                                                setSelectedSector(
                                                   foundSector.sct_id
                                                );
                                                setSelectedDistrict(
                                                   foundSector.sct_district
                                                );
                                                const foundDistrict =
                                                   districts.find(
                                                      (d) =>
                                                         d.dst_id ===
                                                         foundSector.sct_district
                                                   );
                                                if (foundDistrict)
                                                   setSelectedProvince(
                                                      foundDistrict.dst_province
                                                   );
                                             }
                                             const streetOrName =
                                                addr.street ??
                                                addr.display_name ??
                                                "";
                                             const firstSegment =
                                                streetOrName
                                                   .split(",")
                                                   .map((p) => p.trim())
                                                   .filter(Boolean)[0] ||
                                                streetOrName;

                                             setFormData((prev) => ({
                                                ...prev,
                                                address:
                                                   firstSegment || prev.address,
                                                city: addr.city ?? prev.city,
                                                phone: addr.phone ?? prev.phone,
                                             }));
                                          }
                                       }}
                                       className={`p-4 rounded-lg cursor-pointer transition-colors border-2 bg-white hover:border-orange-300 ${
                                          selectedAddress?.id === addr.id
                                             ? "border-orange-400 bg-orange-50"
                                             : "border-gray-200"
                                       }`}
                                    >
                                       <div className="flex items-start">
                                          <div className="flex items-center mr-3">
                                             <div
                                                className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                                   selectedAddress?.id ===
                                                   addr.id
                                                      ? "bg-orange-500 border-orange-500"
                                                      : "border-gray-300"
                                                }`}
                                             >
                                                {selectedAddress?.id ===
                                                   addr.id && (
                                                   <div className="h-2 w-2 bg-white rounded-full" />
                                                )}
                                             </div>
                                          </div>
                                          <div className="flex-1">
                                             <p className="font-medium text-sm text-gray-800">
                                                {addr.display_name}
                                             </p>
                                             <p className="text-sm text-gray-600">
                                                {addr.city}
                                             </p>
                                             {addr.phone && (
                                                <p className="text-sm text-blue-600">
                                                   {t(
                                                      "checkout.contactPhoneLabel"
                                                   )}{" "}
                                                   {addr.phone}
                                                </p>
                                             )}
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                                 <div className="flex justify-end pt-4">
                                    <Button
                                       className="bg-orange-400 hover:bg-orange-500 text-white px-6"
                                       onClick={() => {
                                          setAddressOpen(false);
                                          setInstructionsOpen(true);
                                       }}
                                    >
                                       {t("common.next")}
                                    </Button>
                                 </div>
                              </div>
                           ) : (
                              <div className="text-sm text-gray-500">
                                 {t("checkout.noSavedAddresses")}
                              </div>
                           )}
                        </div>
                     </CollapsibleContent>
                  </Collapsible>
               </div>

               {/* Delivery instructions section */}
               <div className="space-y-4">
                  <Collapsible
                     open={instructionsOpen}
                     onOpenChange={setInstructionsOpen}
                  >
                     <CollapsibleTrigger asChild>
                        <button className="w-full text-left p-0 flex items-center space-x-3 text-gray-600 hover:text-gray-800">
                           <Package className="h-5 w-5" />
                           <span className="text-lg font-medium">
                              {t("checkout.deliveryInstructions")}
                           </span>
                        </button>
                     </CollapsibleTrigger>
                     <CollapsibleContent className="mt-4">
                        <div className="space-y-3">
                           <div>
                              <Label
                                 htmlFor="delivery_notes"
                                 className="text-sm font-medium"
                              >
                                 {t("checkout.deliveryInstructions")}
                              </Label>
                              <textarea
                                 id="delivery_notes"
                                 rows={4}
                                 placeholder={t(
                                    "checkout.writeDeliveryInstructions"
                                 )}
                                 value={formData.delivery_notes || ""}
                                 onChange={(e) =>
                                    setFormData((prev) => ({
                                       ...prev,
                                       delivery_notes: e.target.value,
                                    }))
                                 }
                                 className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                 {t("checkout.deliveryInstructionsHelper")}
                              </p>
                           </div>
                           <div className="flex space-x-2 pt-2">
                              <Button
                                 variant="outline"
                                 onClick={() => setInstructionsOpen(false)}
                                 className="border-gray-300 text-gray-700"
                              >
                                 {t("common.previous")}
                              </Button>
                              <Button
                                 className="bg-orange-400 hover:bg-orange-500 text-white"
                                 onClick={() => {
                                    setInstructionsOpen(false);
                                    setPaymentOpen(true);
                                 }}
                              >
                                 {t("common.next")}
                              </Button>
                           </div>
                        </div>
                     </CollapsibleContent>
                  </Collapsible>
               </div>

               {/* Payment Method section */}
               <div className="space-y-4">
                  <Collapsible
                     open={paymentOpen}
                     onOpenChange={setPaymentOpen}
                  >
                     <CollapsibleTrigger asChild>
                        <button className="w-full text-left p-0 flex items-center space-x-3 text-gray-600 hover:text-gray-800">
                           <CreditCard className="h-5 w-5" />
                           <span className="text-lg font-medium">
                              {t("checkout.paymentMethod")}
                           </span>
                        </button>
                     </CollapsibleTrigger>
                     <CollapsibleContent className="mt-4">
                        <div className="border rounded-lg p-4 bg-gray-50">
                           <p className="text-sm text-gray-600">
                              {t("checkout.selectPaymentMethod")}
                           </p>
                        </div>
                     </CollapsibleContent>
                  </Collapsible>
               </div>
            </div>

            {/* Order Summary - Right Side */}
            <div>
               <Card className="sticky top-4 border border-gray-200">
                  <CardHeader className="pb-4">
                     <CardTitle className="text-lg font-medium">
                        {t("checkout.orderSummary")}
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     {orderItems.map((item, index) => (
                        <div
                           key={`${item.id}-${
                              item.variation_id || "no-variation"
                           }-${index}`}
                        >
                           <div className="flex items-start space-x-3">
                              <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center">
                                 <Package className="h-6 w-6 text-gray-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                 <h4 className="font-medium text-sm text-gray-900 truncate">
                                    {item.name}
                                 </h4>
                                 {item.variation_name && (
                                    <p className="text-xs text-gray-500">
                                       Size: {item.variation_name} •
                                    </p>
                                 )}
                                 <p className="text-sm font-medium text-gray-900 mt-1">
                                    RWF {item.price.toLocaleString()}
                                 </p>
                                 <p className="text-xs text-gray-500">
                                    Quantity: {item.quantity}
                                 </p>
                              </div>
                           </div>
                        </div>
                     ))}

                     <Separator className="my-4" />

                     <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                           <span>{t("checkout.subtotal")}</span>
                           <span>RWF {subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                           <div className="flex items-center">
                              <span>{t("checkout.deliveryFee")}</span>
                              <div className="ml-1 w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center">
                                 <span className="text-xs text-gray-400">
                                    i
                                 </span>
                              </div>
                           </div>
                           <span>RWF {transport.toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                           <span>{t("checkout.total")}</span>
                           <span>RWF {total.toLocaleString()}</span>
                        </div>
                     </div>

                     <div className="space-y-3 pt-4">
                        {selectedAddress && (
                           <div className="border-2 border-amber-200 p-4 rounded-lg bg-gradient-to-r from-amber-50 to-white shadow-sm flex items-start justify-between">
                              <div className="flex items-start">
                                 <div className="mr-3 mt-0.5">
                                    <CheckCircle2 className="h-6 w-6 text-amber-600" />
                                 </div>
                                 <div>
                                    <p className="text-sm font-medium">
                                       {t("checkout.deliveringTo")}
                                    </p>
                                    <p className="text-sm font-semibold">
                                       {selectedAddress.display_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                       {selectedAddress.city}
                                       {selectedAddress.phone
                                          ? ` • ${selectedAddress.phone}`
                                          : ""}
                                    </p>
                                 </div>
                              </div>
                              <div className="flex items-center">
                                 <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setAddressOpen(true)}
                                 >
                                    {t("common.edit")}
                                 </Button>
                              </div>
                           </div>
                        )}

                        {/* Show Place Order only when Kigali is selected (either by province selection or by saved address). */}
                        {isKigali ? (
                           isLoggedIn ? (
                              <Button
                                 className="w-full"
                                 size="lg"
                                 onClick={handleCreateOrder}
                                 disabled={
                                    isSubmitting || orderItems.length === 0
                                 }
                              >
                                 {isSubmitting ? (
                                    <>
                                       <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                       {t("checkout.processing")}
                                    </>
                                 ) : (
                                    <>
                                       <CheckCircle2 className="h-4 w-4 mr-2" />
                                       {t("checkout.placeOrder")}
                                    </>
                                 )}
                              </Button>
                           ) : (
                              <div className="space-y-2">
                                 <p className="text-sm text-muted-foreground text-center">
                                    {t("checkout.loginToPlaceOrder")}
                                 </p>
                                 <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={() =>
                                       router.push("/signin?redirect=/checkout")
                                    }
                                 >
                                    {t("checkout.loginToContinue")}
                                 </Button>
                              </div>
                           )
                        ) : (
                           // Non-Kigali: show only WhatsApp order action
                           <Button
                              variant="outline"
                              className="w-full"
                              size="lg"
                              onClick={handleWhatsAppCheckout}
                              disabled={isSubmitting || orderItems.length === 0}
                           >
                              {t("checkout.orderViaWhatsApp")}
                           </Button>
                        )}
                     </div>
                  </CardContent>
               </Card>
            </div>
         </div>
      </div>
   );
};

export default Checkout;

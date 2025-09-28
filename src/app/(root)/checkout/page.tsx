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
   Plus,
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

   // Enhanced phone validation for Rwanda
   const phoneSchema = z.object({
      phone: z
         .string()
         .nonempty({
            message: t("checkout.errors.phoneRequired") || "Phone is required",
         })
         .refine(
            (val) => {
               // Clean the input - remove all non-digit characters except +
               const cleaned = val.replace(/[^\d+]/g, "");

               // Pattern 1: +250 followed by 9 digits (total 13 chars including +)
               if (/^\+250\d{9}$/.test(cleaned)) return true;

               // Pattern 2: 07 followed by 8 digits (total 10 digits)
               if (/^07\d{8}$/.test(cleaned)) return true;

               return false;
            },
            {
               message:
                  t("checkout.errors.validPhone") ||
                  "Phone must be in format +250XXXXXXXXX or 07XXXXXXXX",
            }
         ),
   });

   const [isSubmitting, setIsSubmitting] = useState(false);
   const [addressOpen, setAddressOpen] = useState(false);
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

   // Selected location ids
   const [selectedProvince, setSelectedProvince] = useState<string | null>(
      null
   );
   const [selectedDistrict, setSelectedDistrict] = useState<string | null>(
      null
   );
   const [selectedSector, setSelectedSector] = useState<string | null>(null);

   // Address form fields for new/edit
   const [houseNumber, setHouseNumber] = useState<string>("");
   const [phoneInput, setPhoneInput] = useState<string>("");
   const [editingAddressId, setEditingAddressId] = useState<string | null>(
      null
   );
   const [isSavingAddress, setIsSavingAddress] = useState(false);

   // Enhanced phone formatting function
   const formatPhoneInput = (input: string) => {
      // Remove all non-digit characters except +
      const cleaned = input.replace(/[^\d+]/g, "");

      // If starts with +250, format as +250 XXX XXX XXX
      if (cleaned.startsWith("+250")) {
         const digits = cleaned.slice(4);
         if (digits.length <= 3) return `+250 ${digits}`;
         if (digits.length <= 6)
            return `+250 ${digits.slice(0, 3)} ${digits.slice(3)}`;
         return `+250 ${digits.slice(0, 3)} ${digits.slice(
            3,
            6
         )} ${digits.slice(6, 9)}`;
      }

      // If starts with 07, format as 07X XXX XXX
      if (cleaned.startsWith("07")) {
         const digits = cleaned;
         if (digits.length <= 3) return digits;
         if (digits.length <= 6)
            return `${digits.slice(0, 3)} ${digits.slice(3)}`;
         return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(
            6,
            10
         )}`;
      }

      return cleaned;
   };

   // Handle phone input with validation
   const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const formatted = formatPhoneInput(input);

      // Limit length based on format
      if (formatted.startsWith("+250")) {
         if (formatted.replace(/[^\d]/g, "").length <= 12) {
            setPhoneInput(formatted);
         }
      } else if (formatted.startsWith("07")) {
         if (formatted.replace(/[^\d]/g, "").length <= 10) {
            setPhoneInput(formatted);
         }
      } else {
         // Allow initial typing
         if (input.length <= 15) {
            setPhoneInput(formatted);
         }
      }

      // Clear phone error as user types
      if (errors?.phone) {
         setErrors((prev: any) => ({ ...prev, phone: undefined }));
      }
   };

   // Normalize phone to E.164 format
   const normalizePhone = (raw: string) => {
      if (!raw) return raw;
      const digits = raw.replace(/[^\d]/g, "");

      // If it's 10 digits starting with 07
      if (digits.length === 10 && digits.startsWith("07")) {
         return `+250${digits.slice(1)}`;
      }

      // If it's 12 digits starting with 250
      if (digits.length === 12 && digits.startsWith("250")) {
         return `+${digits}`;
      }

      // If already in +250 format
      if (raw.startsWith("+250")) {
         return raw.replace(/[^\d+]/g, "");
      }

      return raw;
   };

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
            const possibleCity =
               parts.length >= 2 ? parts[parts.length - 2] : parts[0];
            if (possibleCity && possibleCity.length > 1) {
               setFormData((prev) => ({ ...prev, city: possibleCity }));
               return;
            }
         }

         if (/kigali/i.test(addr)) {
            setFormData((prev) => ({ ...prev, city: "Kigali" }));
         }
      } catch (err) {
         console.error("Auto-fill city error:", err);
      }
   }, [formData.address, selectedAddress]);

   // Keep local orderItems in sync with cart context
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

   // Load location data from JSON imports
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
            if (j.type === "table" && j.data) return j.data;
            return [];
         };

         setProvinces(extract(provincesJson, "1_provinces"));
         setDistricts(extract(districtsJson, "2_districts"));
         setSectors(extract(sectorsJson, "3_sectors"));
      } catch (err) {
         console.error("Failed to load location data:", err);
      }
   }, []);

   // Update dependent lists when selections change
   useEffect(() => {
      if (!selectedProvince) return;
      setSelectedDistrict(null);
      setSelectedSector(null);
   }, [selectedProvince]);

   useEffect(() => {
      if (!selectedDistrict) return;
      setSelectedSector(null);
   }, [selectedDistrict]);

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
   const selectedSectorObj = sectors.find((s) => s.sct_id === selectedSector);
   const sectorFee = selectedSectorObj
      ? (sectorsFees as any)[selectedSectorObj.sct_name]
      : undefined;
   const transport = sectorFee ?? 3000;
   const total = subtotal + transport;

   // Determine if the selected location is Kigali
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

   const getProvinceLabel = (p: any) => {
      const raw = String(p?.prv_name || "").toLowerCase();
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

      const slug = raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      const tryKey = `province.${slug}`;
      const resolved = t(tryKey);
      if (resolved !== tryKey) return resolved;
      return p?.prv_name || tryKey;
   };

   // Form validation
   // Helper to derive a reasonable city value from selected location or saved address
   const deriveCity = () => {
      // Priority: selectedSector (sector name) -> selectedDistrict (district name) -> selectedProvince (province name) -> selectedAddress.city -> formData.city
      try {
         if (selectedSector) {
            const s = sectors.find(
               (x) => String(x.sct_id) === String(selectedSector)
            );
            if (s && s.sct_name) return s.sct_name;
         }

         if (selectedDistrict) {
            const d = districts.find(
               (x) => String(x.dst_id) === String(selectedDistrict)
            );
            if (d && d.dst_name) return d.dst_name;
         }

         if (selectedProvince) {
            const p = provinces.find(
               (x) => String(x.prv_id) === String(selectedProvince)
            );
            if (p && p.prv_name) return p.prv_name;
         }

         if (selectedAddress?.city) return selectedAddress.city;

         if (formData.city && formData.city.trim()) return formData.city.trim();
      } catch (err) {
         console.error("deriveCity error:", err);
      }

      return "";
   };

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

      const hasAddressValue =
         (formData.address && formData.address.trim()) || selectedAddress;
      if (!hasAddressValue)
         formErrors.address =
            t("checkout.errors.addressRequired") ||
            "Delivery address is required";

      // City is derived from selected location (sector/district/province) or saved address.
      // Do not require the user to enter a separate `city` value.

      return formErrors;
   };

   // Handle order creation
   const handleCreateOrder = async () => {
      if (isSubmitting) return;

      const formErrors = validateForm();
      if (Object.keys(formErrors).length > 0) {
         setErrors(formErrors);
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
         const currentPath = "/checkout";
         router.push(`/signin?redirect=${encodeURIComponent(currentPath)}`);
         return;
      }

      if (orderItems.length === 0) {
         toast.error(t("cart.empty"));
         return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
         const derivedCity = deriveCity();

         const orderData: CreateOrderRequest = {
            order: {
               user_id: user!.id,
               subtotal: subtotal,
               tax: transport,
               total: total,
               customer_email: formData.email.trim(),
               customer_first_name: formData.firstName.trim(),
               customer_last_name: formData.lastName.trim(),
               customer_phone:
                  (selectedAddress?.phone || formData.phone || "").trim() ||
                  undefined,
               delivery_address: (
                  selectedAddress?.street ??
                  selectedAddress?.display_name ??
                  formData.address ??
                  ""
               ).trim(),
               // Use derived city (sector/district/province or saved address)
               delivery_city: (
                  derivedCity ||
                  selectedAddress?.city ||
                  formData.city ||
                  ""
               ).trim(),
               status: "pending" as const,
            },
            items: orderItems.map((item) => {
               const explicitProductId = (item as any).product_id as
                  | string
                  | undefined;
               let resolvedProductId: string | undefined = explicitProductId;
               if (!resolvedProductId && typeof item.id === "string") {
                  const idStr = item.id as string;
                  if (idStr.length === 36) {
                     resolvedProductId = idStr;
                  } else if (idStr.length >= 73 && idStr[36] === "-") {
                     resolvedProductId = idStr.slice(0, 36);
                  } else {
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

         if (formData.delivery_notes) {
            orderData.order.delivery_notes = formData.delivery_notes;
         }

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
               try {
                  clearCart();
               } catch (e) {
                  localStorage.removeItem("cart");
               }
               setOrderItems([]);

               toast.success(
                  `Order #${createdOrder.order_number} has been created successfully!`
               );
               router.push(`/orders/${createdOrder.id}`);
            },
            onError: (error: any) => {
               console.error("createOrder.onError", error);
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
         toast.error(
            `Failed to create order: ${error?.message || "Unknown error"}`
         );
         setIsSubmitting(false);
      }
   };

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

      const derivedCity = deriveCity();

      const message = `
*New Order Request*

*Customer Details:*
Name: ${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Phone: ${formData.phone}
Address: ${formData.address}, ${derivedCity || formData.city}

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
         <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="text-center py-12">
               <ShoppingCart className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground mx-auto mb-4 sm:mb-6" />
               <h1 className="text-xl sm:text-3xl font-bold mb-3 sm:mb-4 px-2">
                  {t("checkout.cartEmptyTitle")}
               </h1>
               <p className="text-muted-foreground mb-6 sm:mb-8 px-4 text-sm sm:text-base">
                  {t("checkout.cartEmptyInfo")}
               </p>
               <Button
                  onClick={() => router.push("/")}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base"
               >
                  {t("checkout.continueShopping")}
               </Button>
            </div>
         </div>
      );
   }

   return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
         <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mb-6 sm:mb-8 px-2 sm:px-0">
            {t("checkout.title")}
         </h1>

         <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
            {/* Left Column - Forms */}
            <div className="space-y-4 sm:space-y-6">
               {/* Add delivery address section */}
               <div className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                     <div className="flex items-center space-x-2 sm:space-x-3">
                        <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                        <h2 className="text-base sm:text-lg font-medium">
                           {t("checkout.addDeliveryAddress")}
                        </h2>
                     </div>
                     <Button
                        onClick={() => {
                           setAddNewOpen(true);
                           setAddressOpen(false);
                           setSelectedProvince(null);
                           setSelectedDistrict(null);
                           setSelectedSector(null);
                           setHouseNumber("");
                           setPhoneInput("");
                           setEditingAddressId(null);
                        }}
                        size="sm"
                        variant="outline"
                        className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400 w-full sm:w-auto text-xs sm:text-sm"
                     >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        {t("checkout.addNewAddress")}
                     </Button>
                  </div>

                  {/* Add New Address (collapsible) */}
                  <Collapsible
                     open={addNewOpen}
                     onOpenChange={setAddNewOpen}
                  >
                     <CollapsibleTrigger asChild>
                        <div className="mt-2"></div>
                     </CollapsibleTrigger>
                     <CollapsibleContent className="mt-3 sm:mt-4">
                        <div className="border border-orange-200 rounded-lg p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-orange-25 space-y-3 sm:space-y-4">
                           <div className="text-xs sm:text-sm font-medium text-orange-800">
                              {t("checkout.addNewAddress")}
                           </div>

                           {/* Sequential selects */}
                           <div className="space-y-2 sm:space-y-3">
                              <div>
                                 <Label className="text-xs sm:text-sm font-medium text-gray-700">
                                    Province{" "}
                                    <span className="text-red-500">*</span>
                                 </Label>
                                 <Select
                                    value={selectedProvince ?? ""}
                                    onValueChange={(v) =>
                                       setSelectedProvince(v || null)
                                    }
                                 >
                                    <SelectTrigger className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10">
                                       <SelectValue
                                          placeholder={t(
                                             "checkout.selectProvincePlaceholder"
                                          )}
                                       />
                                    </SelectTrigger>
                                    <SelectContent className="text-xs sm:text-sm max-h-48 sm:max-h-56">
                                       {provinces.map((p: any) => (
                                          <SelectItem
                                             key={p.prv_id}
                                             value={String(p.prv_id)}
                                             className="text-xs sm:text-sm"
                                          >
                                             {getProvinceLabel(p)}
                                          </SelectItem>
                                       ))}
                                    </SelectContent>
                                 </Select>
                              </div>

                              {selectedProvince && (
                                 <div>
                                    <Label className="text-xs sm:text-sm font-medium text-gray-700">
                                       District{" "}
                                       <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                       value={selectedDistrict ?? ""}
                                       onValueChange={(v) =>
                                          setSelectedDistrict(v || null)
                                       }
                                    >
                                       <SelectTrigger className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10">
                                          <SelectValue
                                             placeholder={t(
                                                "checkout.selectDistrictPlaceholder"
                                             )}
                                          />
                                       </SelectTrigger>
                                       <SelectContent className="text-xs sm:text-sm max-h-48 sm:max-h-56">
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
                                                   className="text-xs sm:text-sm"
                                                >
                                                   {d.dst_name}
                                                </SelectItem>
                                             ))}
                                       </SelectContent>
                                    </Select>
                                 </div>
                              )}

                              {selectedDistrict &&
                                 (() => {
                                    const selectedProvinceObj = provinces.find(
                                       (p: any) =>
                                          String(p.prv_id) ===
                                          String(selectedProvince)
                                    );
                                    const provinceIsKigali = Boolean(
                                       selectedProvinceObj?.prv_name
                                          ?.toLowerCase()
                                          .includes("kigali")
                                    );

                                    if (!provinceIsKigali) return null;

                                    return (
                                       <div>
                                          <Label className="text-xs sm:text-sm font-medium text-gray-700">
                                             Sector{" "}
                                             <span className="text-red-500">
                                                *
                                             </span>
                                          </Label>
                                          <Select
                                             value={selectedSector ?? ""}
                                             onValueChange={(v) =>
                                                setSelectedSector(v || null)
                                             }
                                          >
                                             <SelectTrigger className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10">
                                                <SelectValue
                                                   placeholder={t(
                                                      "checkout.selectSectorPlaceholder"
                                                   )}
                                                />
                                             </SelectTrigger>
                                             <SelectContent className="text-xs sm:text-sm max-h-48 sm:max-h-56">
                                                {sectors
                                                   .filter(
                                                      (s: any) =>
                                                         s.sct_district ===
                                                         selectedDistrict
                                                   )
                                                   .map((s: any) => (
                                                      <SelectItem
                                                         key={s.sct_id}
                                                         value={String(
                                                            s.sct_id
                                                         )}
                                                         className="text-xs sm:text-sm"
                                                      >
                                                         {s.sct_name}
                                                      </SelectItem>
                                                   ))}
                                             </SelectContent>
                                          </Select>
                                       </div>
                                    );
                                 })()}
                           </div>

                           {/* Address form */}
                           <div className="pt-1 sm:pt-2 space-y-2 sm:space-y-3">
                              <div className="text-xs sm:text-sm font-medium text-gray-700">
                                 {t("checkout.otherInfo")}
                              </div>

                              <div>
                                 <Label className="text-xs sm:text-sm font-medium text-gray-700">
                                    {t("checkout.houseStreet")}
                                 </Label>
                                 <Input
                                    placeholder={t(
                                       "checkout.houseStreetPlaceholder"
                                    )}
                                    value={houseNumber}
                                    onChange={(e) =>
                                       setHouseNumber(e.target.value)
                                    }
                                    className="border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10"
                                 />
                              </div>

                              <div>
                                 <Label className="text-xs sm:text-sm font-medium text-gray-700">
                                    {t("checkout.phone")}{" "}
                                    <span className="text-red-500">*</span>
                                 </Label>
                                 <div className="relative">
                                    <Input
                                       placeholder="07X XXX XXX or +250 XXX XXX XXX"
                                       value={phoneInput}
                                       onChange={handlePhoneChange}
                                       className={`border-gray-300 focus:border-orange-500 focus:ring-orange-500 text-xs sm:text-sm h-9 sm:h-10 ${
                                          errors?.phone
                                             ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                             : ""
                                       }`}
                                    />
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                                       {phoneInput.startsWith("+250")
                                          ? "RW"
                                          : phoneInput.startsWith("07")
                                          ? "RW"
                                          : ""}
                                    </div>
                                 </div>
                                 {errors?.phone && (
                                    <p className="text-xs text-red-600 mt-1">
                                       {errors.phone}
                                    </p>
                                 )}
                                 <p className="text-xs text-gray-500 mt-1">
                                    Format: +250 XXX XXX XXX or 07X XXX XXX
                                 </p>
                              </div>

                              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-1 sm:pt-2">
                                 <Button
                                    onClick={async () => {
                                       if (isSavingAddress) return;

                                       const selectedProvinceObj =
                                          provinces.find(
                                             (p: any) =>
                                                String(p.prv_id) ===
                                                String(selectedProvince)
                                          );
                                       const provinceIsKigali = Boolean(
                                          selectedProvinceObj?.prv_name
                                             ?.toLowerCase()
                                             .includes("kigali")
                                       );

                                       if (
                                          provinceIsKigali &&
                                          !selectedSector
                                       ) {
                                          toast.error(
                                             "Please select a sector for delivery"
                                          );
                                          return;
                                       }

                                       setIsSavingAddress(true);

                                       // Validate phone with enhanced schema
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
                                       const districtObj = districts.find(
                                          (d) => d.dst_id === selectedDistrict
                                       );
                                       const cityName = provinceIsKigali
                                          ? sectorObj?.sct_name || ""
                                          : districtObj?.dst_name || "";
                                       const derivedDisplayName = sectorObj
                                          ? `${sectorObj.sct_name} address`
                                          : "Address";

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
                                                      house_number: houseNumber,
                                                      phone: normalizedPhone,
                                                      city: cityName,
                                                   }
                                                );
                                             if (updated)
                                                toast.success(
                                                   t("checkout.updatedSuccess")
                                                );
                                             else
                                                toast.error(
                                                   t("checkout.updateFailed")
                                                );
                                          } else {
                                             const saved = await saveAddress({
                                                display_name:
                                                   derivedDisplayName,
                                                lat: "0",
                                                lon: "0",
                                                address: { city: cityName },
                                                street: cityName,
                                                house_number: houseNumber,
                                                phone: normalizedPhone,
                                                is_default: false,
                                             });
                                             if (saved)
                                                toast.success(
                                                   t("checkout.savedSuccess")
                                                );
                                             else
                                                toast.error(
                                                   t("checkout.saveFailed")
                                                );
                                          }

                                          // Refresh and switch UI
                                          await reloadSaved();
                                          setAddNewOpen(false);
                                          setAddressOpen(true);
                                          setEditingAddressId(null);
                                          setHouseNumber("");
                                          setPhoneInput("");
                                       } catch (err) {
                                          console.error(err);
                                          toast.error(t("checkout.saveFailed"));
                                       } finally {
                                          setIsSavingAddress(false);
                                       }
                                    }}
                                    disabled={isSavingAddress}
                                    className="bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm h-9 sm:h-10"
                                 >
                                    {isSavingAddress ? (
                                       <>
                                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                                          {t("common.saving") || "Saving..."}
                                       </>
                                    ) : (
                                       t("common.save")
                                    )}
                                 </Button>
                                 <Button
                                    variant="outline"
                                    onClick={() => {
                                       setEditingAddressId(null);
                                       setHouseNumber("");
                                       setPhoneInput("");
                                       setAddNewOpen(false);
                                    }}
                                    className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm h-9 sm:h-10"
                                 >
                                    {t("common.cancel")}
                                 </Button>
                              </div>
                           </div>
                        </div>
                     </CollapsibleContent>
                  </Collapsible>

                  {/* Select delivery address */}
                  <Collapsible
                     open={addressOpen}
                     onOpenChange={setAddressOpen}
                  >
                     <CollapsibleTrigger asChild>
                        <button className="w-full text-left p-0 flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors text-sm">
                           {addressOpen ? (
                              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                           ) : (
                              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                           )}
                           <span className="text-xs sm:text-sm font-medium">
                              {t("checkout.selectDeliveryAddress")}
                           </span>
                        </button>
                     </CollapsibleTrigger>
                     <CollapsibleContent className="mt-3 sm:mt-4">
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                           {savedAddresses && savedAddresses.length > 0 ? (
                              <div className="space-y-2 sm:space-y-3">
                                 {savedAddresses.map((addr) => (
                                    <div
                                       key={addr.id}
                                       role="button"
                                       tabIndex={0}
                                       onClick={() => {
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
                                       className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 bg-white hover:border-orange-300 hover:shadow-sm ${
                                          selectedAddress?.id === addr.id
                                             ? "border-orange-400 bg-orange-50 shadow-sm"
                                             : "border-gray-200"
                                       }`}
                                    >
                                       <div className="flex items-start">
                                          <div className="flex items-center mr-2 sm:mr-3 mt-0.5">
                                             <div
                                                className={`h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                   selectedAddress?.id ===
                                                   addr.id
                                                      ? "bg-orange-500 border-orange-500"
                                                      : "border-gray-300"
                                                }`}
                                             >
                                                {selectedAddress?.id ===
                                                   addr.id && (
                                                   <div className="h-1 w-1 sm:h-2 sm:w-2 bg-white rounded-full" />
                                                )}
                                             </div>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                             <p className="font-medium text-xs sm:text-sm text-gray-800 truncate">
                                                {addr.display_name}
                                             </p>
                                             <p className="text-xs text-gray-600 mt-0.5">
                                                {addr.city}
                                             </p>
                                             {addr.phone && (
                                                <p className="text-xs text-orange-600 mt-1">
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
                                 <div className="flex flex-col sm:flex-row justify-between pt-3 sm:pt-4 gap-2 sm:gap-0">
                                    <Button
                                       variant="outline"
                                       className="border-orange-300 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm h-9 sm:h-10"
                                       onClick={() => router.push("/addresses")}
                                    >
                                       Manage Addresses
                                    </Button>
                                    <Button
                                       className="bg-orange-500 hover:bg-orange-600 text-white px-4 text-xs sm:text-sm h-9 sm:h-10"
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
                              <div className="text-xs sm:text-sm text-gray-500 text-center py-3 sm:py-4">
                                 {t("checkout.noSavedAddresses")}
                              </div>
                           )}
                        </div>
                     </CollapsibleContent>
                  </Collapsible>
               </div>

               {/* Delivery instructions section */}
               <div className="space-y-3 sm:space-y-4">
                  <Collapsible
                     open={instructionsOpen}
                     onOpenChange={setInstructionsOpen}
                  >
                     <CollapsibleTrigger asChild>
                        <button className="w-full text-left p-0 flex items-center space-x-2 sm:space-x-3 text-gray-600 hover:text-orange-600 transition-colors">
                           <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                           <span className="text-base sm:text-lg font-medium">
                              {t("checkout.deliveryInstructions")}
                           </span>
                        </button>
                     </CollapsibleTrigger>
                     <CollapsibleContent className="mt-3 sm:mt-4">
                        <div className="space-y-3 sm:space-y-4 border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                           <div>
                              <Label
                                 htmlFor="delivery_notes"
                                 className="text-xs sm:text-sm font-medium text-gray-700"
                              >
                                 {t("checkout.deliveryInstructions")}
                              </Label>
                              <textarea
                                 id="delivery_notes"
                                 rows={3}
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
                                 className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none transition-colors text-xs sm:text-sm"
                              />
                              <p className="mt-2 text-xs text-gray-500">
                                 {t("checkout.deliveryInstructionsHelper")}
                              </p>
                           </div>
                           <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-1 sm:pt-2">
                              <Button
                                 variant="outline"
                                 onClick={() => setInstructionsOpen(false)}
                                 className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm h-9 sm:h-10"
                              >
                                 {t("common.previous")}
                              </Button>
                              <Button
                                 className="bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm h-9 sm:h-10"
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
               <div className="space-y-3 sm:space-y-4">
                  <Collapsible
                     open={paymentOpen}
                     onOpenChange={setPaymentOpen}
                  >
                     <CollapsibleTrigger asChild>
                        <button className="w-full text-left p-0 flex items-center space-x-2 sm:space-x-3 text-gray-600 hover:text-orange-600 transition-colors">
                           <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                           <span className="text-base sm:text-lg font-medium">
                              {t("checkout.paymentMethod")}
                           </span>
                        </button>
                     </CollapsibleTrigger>
                     <CollapsibleContent className="mt-3 sm:mt-4">
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                           <p className="text-xs sm:text-sm text-gray-600">
                              {t("checkout.selectPaymentMethod")}
                           </p>
                        </div>
                     </CollapsibleContent>
                  </Collapsible>
               </div>
            </div>

            {/* Order Summary - Right Side */}
            <div className="lg:sticky lg:top-4">
               <Card className="border border-gray-200 shadow-sm w-full max-w-full overflow-hidden">
                  <CardHeader className="pb-3 sm:pb-4">
                     <CardTitle className="text-base sm:text-lg font-medium text-gray-900">
                        {t("checkout.orderSummary")}
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                     {/* Order Items with proper wrapping */}
                     <div className="max-h-60 sm:max-h-80 overflow-y-auto -mr-1 sm:-mr-2 pr-1 sm:pr-2">
                        {orderItems.map((item, index) => (
                           <div
                              key={`${item.id}-${
                                 item.variation_id || "no-variation"
                              }-${index}`}
                              className="border-b border-gray-100 pb-2 sm:pb-3 last:border-b-0"
                           >
                              <div className="flex items-start gap-2 sm:gap-3">
                                 <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded flex-shrink-0 flex items-center justify-center mt-0.5">
                                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    {/* Product name with proper line wrapping */}
                                    <h4 className="font-medium text-xs sm:text-sm text-gray-900 break-words leading-tight">
                                       {item.name}
                                    </h4>
                                    {item.variation_name && (
                                       <p className="text-xs text-gray-500 mt-0.5">
                                          Size: {item.variation_name}
                                       </p>
                                    )}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 mt-1 sm:mt-2">
                                       <p className="text-xs sm:text-sm font-medium text-gray-900">
                                          RWF {item.price.toLocaleString()}
                                       </p>
                                       <div className="flex items-center justify-between sm:justify-end gap-2">
                                          <p className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded whitespace-nowrap">
                                             Qty: {item.quantity}
                                          </p>
                                          <p className="text-xs sm:text-sm font-medium text-orange-600 whitespace-nowrap">
                                             RWF{" "}
                                             {(
                                                item.price * item.quantity
                                             ).toLocaleString()}
                                          </p>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>

                     <Separator className="my-3 sm:my-4" />

                     {/* Order Totals */}
                     <div className="space-y-2 sm:space-y-3">
                        <div className="flex justify-between text-xs sm:text-sm">
                           <span className="text-gray-600">
                              {t("checkout.subtotal")}
                           </span>
                           <span className="font-medium">
                              RWF {subtotal.toLocaleString()}
                           </span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm items-center">
                           <div className="flex items-center">
                              <span className="text-gray-600">
                                 {t("checkout.deliveryFee")}
                              </span>
                              <div className="ml-2 w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-gray-400 flex items-center justify-center">
                                 <span className="text-xs text-gray-400">
                                    i
                                 </span>
                              </div>
                           </div>
                           <span className="font-medium text-orange-600">
                              RWF {transport.toLocaleString()}
                           </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-sm sm:text-lg font-bold">
                           <span className="text-gray-900">
                              {t("checkout.total")}
                           </span>
                           <span className="text-orange-600">
                              RWF {total.toLocaleString()}
                           </span>
                        </div>
                     </div>

                     {/* Delivery Address & Order Buttons */}
                     <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4">
                        {selectedAddress && (
                           <div className="border-2 border-orange-200 p-3 sm:p-4 rounded-lg bg-gradient-to-r from-orange-50 to-white shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                 <div className="flex items-start min-w-0 flex-1">
                                    <div className="mr-2 sm:mr-3 mt-0.5 flex-shrink-0">
                                       <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                       <p className="text-xs sm:text-sm font-medium text-gray-900">
                                          {t("checkout.deliveringTo")}
                                       </p>
                                       <p className="text-xs sm:text-sm font-semibold text-gray-800 break-words">
                                          {selectedAddress.display_name}
                                       </p>
                                       <p className="text-xs text-gray-600 break-words">
                                          {selectedAddress.city}
                                          {selectedAddress.phone
                                             ? ` • ${selectedAddress.phone}`
                                             : ""}
                                       </p>
                                    </div>
                                 </div>
                                 <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setAddressOpen(true)}
                                    className="border-orange-300 text-orange-600 hover:bg-orange-50 flex-shrink-0 text-xs h-7 sm:h-9 whitespace-nowrap"
                                 >
                                    {t("common.edit")}
                                 </Button>
                              </div>
                           </div>
                        )}

                        {/* Order buttons */}
                        <div className="pt-1">
                           {isKigali ? (
                              isLoggedIn ? (
                                 <Button
                                    className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base h-10 sm:h-12"
                                    onClick={handleCreateOrder}
                                    disabled={
                                       isSubmitting || orderItems.length === 0
                                    }
                                 >
                                    {isSubmitting ? (
                                       <>
                                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                                          {t("checkout.processing")}
                                       </>
                                    ) : (
                                       <>
                                          <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                          {t("checkout.placeOrder")}
                                       </>
                                    )}
                                 </Button>
                              ) : (
                                 <div className="space-y-2">
                                    <p className="text-xs sm:text-sm text-gray-600 text-center">
                                       {t("checkout.loginToPlaceOrder")}
                                    </p>
                                    <Button
                                       className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base h-10 sm:h-12"
                                       onClick={() =>
                                          router.push(
                                             `/signin?redirect=${encodeURIComponent(
                                                "/checkout"
                                             )}`
                                          )
                                       }
                                    >
                                       {t("checkout.loginToContinue")}
                                    </Button>
                                 </div>
                              )
                           ) : (
                              <Button
                                 variant="outline"
                                 className="w-full border-orange-300 text-orange-600 hover:bg-orange-50 text-sm sm:text-base h-10 sm:h-12"
                                 onClick={handleWhatsAppCheckout}
                                 disabled={
                                    isSubmitting || orderItems.length === 0
                                 }
                              >
                                 {t("checkout.orderViaWhatsApp")}
                              </Button>
                           )}
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </div>
         </div>
      </div>
   );
};

export default Checkout;

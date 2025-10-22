"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { supabase } from "@/integrations/supabase/client";
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
   AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import PaymentMethodSelector from "@/components/payments/PaymentMethodSelector";
import { useKPayPayment } from "@/hooks/useKPayPayment";
import { PAYMENT_METHODS } from "@/lib/services/kpay";

interface CartItem {
   id: string;
   name: string;
   price: number;
   quantity: number;
   sku?: string;
   variation_id?: string;
   variation_name?: string;
}

const CheckoutPage = ({
   isRetryMode,
   retryOrderId,
}: {
   isRetryMode: boolean;
   retryOrderId: string | null;
}) => {
   const { t } = useLanguage();
   const { user, isLoggedIn } = useAuth();
   const { createOrder } = useOrders();
   const router = useRouter();
   const searchParams = useSearchParams();

   const [formData, setFormData] = useState({
      email: "",
      firstName: "",
      lastName: "",
      address: "",
      city: "",
      phone: "",
      delivery_notes: "",
   });
   // LocalStorage persistence keys and helpers
   const CHECKOUT_STORAGE_KEY = "nihemart_checkout_v1";

   const loadCheckoutFromStorage = () => {
      try {
         if (typeof window === "undefined") return null;
         const raw = localStorage.getItem(CHECKOUT_STORAGE_KEY);
         if (!raw) return null;
         return JSON.parse(raw);
      } catch (err) {
         console.warn("Failed to load checkout from storage:", err);
         return null;
      }
   };

   const saveCheckoutToStorage = (payload: any) => {
      try {
         if (typeof window === "undefined") return;
         localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
         console.warn("Failed to save checkout to storage:", err);
      }
   };

   const clearCheckoutStorage = () => {
      try {
         if (typeof window === "undefined") return;
         localStorage.removeItem(CHECKOUT_STORAGE_KEY);
      } catch (err) {
         /* ignore */
      }
   };

   // Clear all client-side checkout state after successful order creation
   const clearAllCheckoutClientState = () => {
      try {
         // primary checkout storage key
         clearCheckoutStorage();
      } catch (e) {}
      try {
         // Make double-sure to remove the key if different casing or older keys exist
         if (typeof window !== "undefined") {
            try {
               localStorage.removeItem("nihemart_checkout_v1");
            } catch (e) {}
            try {
               localStorage.removeItem("checkout");
            } catch (e) {}
         }
      } catch (e) {}
      try {
         if (typeof window !== "undefined") {
            sessionStorage.removeItem("kpay_reference");
         }
      } catch (e) {}
      try {
         if (typeof window !== "undefined") {
            localStorage.removeItem("cart");
         }
      } catch (e) {}
   };
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

   // KPay payment functionality
   const {
      initiatePayment,
      formatPhoneNumber,
      validatePaymentRequest,
      isInitiating,
   } = useKPayPayment();

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
   // Pre-pay flow state: track when a payment returned to checkout and whether it's verified
   const [paymentReturnedOrderId, setPaymentReturnedOrderId] = useState<
      string | null
   >(null);
   const [paymentVerified, setPaymentVerified] = useState<boolean>(false);
   // Track when a payment flow is actively being initiated to avoid
   // the empty-cart redirect racing the redirect to external gateway
   const [paymentInProgress, setPaymentInProgress] = useState(false);
   // When true, suppress automatic redirect to landing even if cart becomes empty.
   // This prevents the UX where clearing the cart during order creation briefly
   // navigates the user to the homepage before we navigate to the order page.
   const [suppressEmptyCartRedirect, setSuppressEmptyCartRedirect] =
      useState(false);
   // Payment method state (start empty so user must explicitly choose)
   const [paymentMethod, setPaymentMethod] = useState<
      keyof typeof PAYMENT_METHODS | "cash_on_delivery" | ""
   >("");

   // Mobile money phone numbers state
   const [mobileMoneyPhones, setMobileMoneyPhones] = useState<{
      mtn_momo?: string;
      airtel_money?: string;
   }>({});

   // Orders enabled flag (null = loading)
   const [ordersEnabled, setOrdersEnabled] = useState<boolean | null>(null);
   const [ordersDisabledMessage, setOrdersDisabledMessage] = useState<
      string | null
   >(null);

   // Retry mode state (now passed as props). We also fall back to URL search params

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

   // Handle mobile money phone number changes
   const handleMobileMoneyPhoneChange = (
      method: "mtn_momo" | "airtel_money",
      phoneNumber: string
   ) => {
      setMobileMoneyPhones((prev) => ({
         ...prev,
         [method]: phoneNumber,
      }));
   };

   // no hydration debug used

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

   // Derive effective retry flags: prefer props, fall back to search params
   // If searchParams is not populated (sometimes Next client hook is empty), fallback to parsing window.location.search
   const fallbackParams =
      typeof window !== "undefined"
         ? new URLSearchParams(window.location.search)
         : null;
   const effectiveIsRetry =
      isRetryMode ||
      searchParams?.get("retry") === "true" ||
      fallbackParams?.get("retry") === "true";

   // Normalize orderId from props/query; treat literal 'null'/'undefined' as null
   const _rawOrderId =
      retryOrderId ??
      searchParams?.get("orderId") ??
      (fallbackParams ? fallbackParams.get("orderId") : null) ??
      null;
   const effectiveRetryOrderId =
      _rawOrderId && _rawOrderId !== "null" && _rawOrderId !== "undefined"
         ? _rawOrderId
         : null;

   // Restore persisted checkout state (if any) on mount
   useEffect(() => {
      try {
         const persisted = loadCheckoutFromStorage();
         if (!persisted) return;

         // Only restore when not in retry mode and when user hasn't already filled fields
         if (!effectiveIsRetry) {
            if (persisted.formData)
               setFormData((prev) => ({ ...prev, ...persisted.formData }));
            if (persisted.paymentMethod)
               setPaymentMethod(persisted.paymentMethod);
            if (persisted.mobileMoneyPhones)
               setMobileMoneyPhones(persisted.mobileMoneyPhones);
            if ((!orderItems || orderItems.length === 0) && persisted.cart) {
               // restore lightweight cart snapshot
               try {
                  setOrderItems(persisted.cart);
               } catch (e) {
                  /* ignore */
               }
            }
         }
      } catch (err) {
         console.warn("Failed to restore checkout state:", err);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   // Persist checkout state when relevant parts change (debounced)
   useEffect(() => {
      const toSave = {
         formData,
         paymentMethod,
         mobileMoneyPhones,
         cart: orderItems,
      };

      const id = setTimeout(() => saveCheckoutToStorage(toSave), 250);
      return () => clearTimeout(id);
   }, [formData, paymentMethod, mobileMoneyPhones, orderItems]);

   // Detect return from payment flow (e.g. ?payment=success&orderId=...)
   useEffect(() => {
      try {
         const p =
            searchParams?.get("payment") ||
            (typeof window !== "undefined"
               ? new URLSearchParams(window.location.search).get("payment")
               : null);
         const oid =
            searchParams?.get("orderId") ||
            (typeof window !== "undefined"
               ? new URLSearchParams(window.location.search).get("orderId")
               : null);
         if (p === "success" && oid) {
            setPaymentReturnedOrderId(oid);

            // verify payment server-side to avoid spoofing
            (async () => {
               try {
                  const resp = await fetch(`/api/payments/order/${oid}`);
                  if (!resp.ok) {
                     setPaymentVerified(false);
                     return;
                  }
                  const payments = await resp.json();
                  const ok =
                     Array.isArray(payments) &&
                     payments.some(
                        (p: any) =>
                           p.status === "completed" || p.status === "successful"
                     );
                  setPaymentVerified(!!ok);
                  if (ok) {
                     toast.success(
                        "Payment completed successfully. You can now finalize your order."
                     );
                  } else {
                     toast.error(
                        "Payment returned but no successful payment was found. Please check your order or try another method."
                     );
                  }
               } catch (e) {
                  console.error("Failed to verify returned payment:", e);
                  setPaymentVerified(false);
               }
            })();
         }
      } catch (e) {
         // ignore
      }
   }, [searchParams]);

   // Detect session-based return from KPay (no orderId in query). We store
   // the kpay_reference in sessionStorage before redirecting. On return we
   // poll the status endpoint by reference until the webhook has created the
   // order (or a timeout occurs), then allow the user to finalize. If the
   // query includes payment=success without an orderId, treat it as a
   // session-based success and show a non-intrusive banner instead of
   // re-initiating payments.
   useEffect(() => {
      let mounted = true;

      const checkReference = async (reference: string) => {
         try {
            // Poll with exponential backoff up to ~12s
            const maxAttempts = 6;
            for (let attempt = 0; attempt < maxAttempts && mounted; attempt++) {
               const resp = await fetch(`/api/payments/kpay/status`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ reference }),
               });

               if (!resp.ok) {
                  // wait and retry
                  await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
                  continue;
               }

               const data = await resp.json();

               // If the status endpoint returned an order id (webhook created it), we can verify payments
               if (data.orderId) {
                  // Verify payments for the order
                  try {
                     const paymentsResp = await fetch(
                        `/api/payments/order/${data.orderId}`
                     );
                     if (paymentsResp.ok) {
                        const payments = await paymentsResp.json();
                        const ok =
                           Array.isArray(payments) &&
                           payments.some(
                              (p: any) =>
                                 p.status === "completed" ||
                                 p.status === "successful"
                           );
                        setPaymentReturnedOrderId(data.orderId);
                        setPaymentVerified(!!ok);
                        if (ok) {
                           toast.success(
                              "Payment completed successfully. You can now finalize your order."
                           );
                        } else {
                           toast.error(
                              "Payment returned but no successful payment was found. Please check your order or contact support."
                           );
                        }
                        try {
                           sessionStorage.removeItem("kpay_reference");
                        } catch (e) {}
                        try {
                           clearCheckoutStorage();
                        } catch (e) {}
                        return;
                     }
                  } catch (e) {
                     // continue polling
                  }
               }

               // If the status endpoint returned the session info but no orderId,
               // and the session status is 'completed', call the finalize endpoint
               // to create the order and link payments.
               if (!data.orderId && data.status === "completed") {
                  try {
                     // Call finalize endpoint with the reference
                     const finResp = await fetch(
                        `/api/payments/kpay/finalize`,
                        {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                           body: JSON.stringify({ reference }),
                        }
                     );

                     if (finResp.ok) {
                        const finData = await finResp.json();
                        if (finData?.success && finData.orderId) {
                           setPaymentReturnedOrderId(finData.orderId);
                           // Verify payments for the created order
                           try {
                              const paymentsResp2 = await fetch(
                                 `/api/payments/order/${finData.orderId}`
                              );
                              if (paymentsResp2.ok) {
                                 const payments2 = await paymentsResp2.json();
                                 const ok2 =
                                    Array.isArray(payments2) &&
                                    payments2.some(
                                       (p: any) =>
                                          p.status === "completed" ||
                                          p.status === "successful"
                                    );
                                 setPaymentVerified(!!ok2);
                                 if (ok2) {
                                    toast.success(
                                       "Payment verified and order created. Redirecting to order..."
                                    );
                                    // Clear reference and navigate to order
                                    try {
                                       sessionStorage.removeItem(
                                          "kpay_reference"
                                       );
                                    } catch (e) {}
                                    try {
                                       clearCheckoutStorage();
                                    } catch (e) {}
                                    setTimeout(
                                       () =>
                                          router.push(
                                             `/orders/${finData.orderId}`
                                          ),
                                       250
                                    );
                                    return;
                                 }
                              }
                           } catch (e) {
                              // ignore verification error
                           }
                        }
                     }
                  } catch (err) {
                     console.error("Failed to finalize session:", err);
                  }
               }

               // If not found yet, wait then retry
               await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
            }

            // If we exit loop without finding an order, notify and clear only
            // the KPay reference. Preserve the checkout snapshot so the user
            // can still complete the order on this page (avoids losing delivery
            // instructions or other form data). The checkout storage will be
            // cleared only after an actual order creation.
            if (mounted) {
               toast.error(
                  "Payment returned but verification timed out. Please check your orders page later."
               );
               try {
                  sessionStorage.removeItem("kpay_reference");
               } catch (e) {}
               // NOTE: do NOT clear nihemart_checkout_v1 here — preserve checkout state
            }
         } catch (err) {
            console.error("Failed to poll payment status by reference:", err);
         }
      };

      try {
         const p =
            searchParams?.get("payment") ||
            (typeof window !== "undefined"
               ? new URLSearchParams(window.location.search).get("payment")
               : null);
         const oid =
            searchParams?.get("orderId") ||
            (typeof window !== "undefined"
               ? new URLSearchParams(window.location.search).get("orderId")
               : null);

         // If already handled by the orderId-based flow above, skip
         if (p === "success" && oid) return;

         // If the URL indicates a success but there is no orderId (session-based)
         // then clear any stored reference and show success banner; do NOT
         // start polling or re-initiate payments from the checkout page.
         if (p === "success" && !oid) {
            // User returned from payment provider but no orderId was created by
            // the webhook yet. Do NOT remove the stored kpay_reference here -
            // preserve it so the checkout page (or the auto-link flow after
            // order creation) can link the payment to the newly created order.
            try {
               const ref =
                  typeof window !== "undefined"
                     ? sessionStorage.getItem("kpay_reference")
                     : null;
               if (ref) {
                  // trigger a best-effort status check so DB may be up-to-date
                  fetch(`/api/payments/kpay/status`, {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ reference: ref }),
                  }).catch(() => {});
               }
            } catch (e) {}

            // Inform the user that payment was successful and they can place order
            toast.success(
               "Payment completed successfully. You can now finalize your order on this page."
            );
            // Mark payment as verified for session-based flows so the Place Order button becomes enabled
            try {
               setPaymentVerified(true);
            } catch (e) {}
            // Do not clear paymentReturnedOrderId - allow user to create order which will trigger linking
            return;
         }

         // Check for stored reference and start polling by reference only if present
         const ref =
            typeof window !== "undefined"
               ? sessionStorage.getItem("kpay_reference")
               : null;
         if (ref) {
            // start polling
            checkReference(ref);
         }
      } catch (e) {
         /* ignore */
      }

      return () => {
         mounted = false;
      };
   }, [searchParams]);

   // If saved addresses finish loading after we fetched the existing order,
   // try matching and selecting the saved address. This runs separately so
   // that address preselection works even when addresses load asynchronously
   // after the order fetch.
   useEffect(() => {
      try {
         // If there are no saved addresses, nothing to do
         if (!Array.isArray(savedAddresses) || savedAddresses.length === 0)
            return;

         // If we're in retry mode, attempt to restore a previously persisted
         // checkout snapshot from localStorage and match the saved address.
         if (effectiveIsRetry) {
            const persisted = loadCheckoutFromStorage();
            if (persisted && persisted.formData) {
               const orderAddrRaw = (
                  persisted.formData.address || ""
               ).toLowerCase();
               const orderCity = (persisted.formData.city || "").toLowerCase();
               const orderPhone = persisted.formData.phone || "";

               const match = savedAddresses.find((addr: any) => {
                  const addrStr = [addr.display_name, addr.street, addr.city]
                     .filter(Boolean)
                     .join(" ")
                     .toLowerCase();

                  return (
                     (orderAddrRaw &&
                        orderAddrRaw.length > 0 &&
                        addrStr.includes(orderAddrRaw)) ||
                     (orderCity &&
                        orderCity.length > 0 &&
                        addrStr.includes(orderCity)) ||
                     (addr.phone && orderPhone && addr.phone === orderPhone)
                  );
               });

               if (match) {
                  if (selectedAddress?.id !== match.id) {
                     selectAddress(match.id);
                     const foundSector = sectors.find(
                        (s: any) =>
                           s.sct_name === match.street ||
                           s.sct_name === match.display_name ||
                           s.sct_name === match.city
                     );
                     if (foundSector) {
                        setSelectedSector(foundSector.sct_id);
                        setSelectedDistrict(foundSector.sct_district);
                        const foundDistrict = districts.find(
                           (d) => d.dst_id === foundSector.sct_district
                        );
                        if (foundDistrict)
                           setSelectedProvince(foundDistrict.dst_province);
                     }

                     setFormData((prev) => ({
                        ...prev,
                        address: match.display_name || prev.address,
                        city: match.city || prev.city,
                        phone: match.phone || prev.phone,
                     }));
                  }
               }
            }

            return;
         }

         // If not in retry mode, do nothing here.
      } catch (err) {
         console.error("Address preselect error:", err);
      }
   }, [effectiveIsRetry, savedAddresses, selectedAddress, sectors, districts]);

   // Auto-select a reasonable default address when none is selected.
   // Priority: already-selected (do nothing) -> saved default (is_default) -> single address -> first address
   useEffect(() => {
      try {
         if (!Array.isArray(savedAddresses) || savedAddresses.length === 0)
            return;

         // If there is already a selected address, do not override it
         if (selectedAddress) return;

         // Prefer the explicit default
         let pick = savedAddresses.find((a: any) => a.is_default);

         // If none marked default, but there's only one address, pick it
         if (!pick && savedAddresses.length === 1) pick = savedAddresses[0];

         // Otherwise fall back to the first address in the list
         if (!pick) pick = savedAddresses[0];

         if (pick) {
            // capture values locally to avoid TS complaints about possibly undefined pick within closures
            const _pick = pick as any;
            selectAddress(_pick.id);

            // Populate form fields with picked address
            setFormData((prev) => ({
               ...prev,
               address: _pick.display_name || prev.address,
               city: _pick.city || prev.city,
               phone: _pick.phone || prev.phone,
            }));

            // Try to match location selections based on picked address
            const foundSector = sectors.find(
               (s: any) =>
                  s.sct_name === _pick.street ||
                  s.sct_name === _pick.display_name ||
                  s.sct_name === _pick.city
            );
            if (foundSector) {
               setSelectedSector(foundSector.sct_id);
               setSelectedDistrict(foundSector.sct_district);
               const foundDistrict = districts.find(
                  (d) => d.dst_id === foundSector.sct_district
               );
               if (foundDistrict)
                  setSelectedProvince(foundDistrict.dst_province);
            }
         }
      } catch (err) {
         console.error("Auto-select address error:", err);
      }
   }, [savedAddresses, selectedAddress, sectors, districts, selectAddress]);

   // Show a small banner when retrying due to timeout
   const retryTimedOut = Boolean(searchParams?.get("timedout"));

   // Fetch orders_enabled flag and subscribe for realtime changes
   useEffect(() => {
      let mounted = true;
      (async () => {
         try {
            const res = await fetch("/api/admin/settings/orders-enabled");
            if (!res.ok) {
               if (mounted) setOrdersEnabled(true);
            } else {
               const j = await res.json();
               if (mounted) {
                  setOrdersEnabled(Boolean(j.enabled));
                  // show message if provided
                  if (typeof j.message === "string") {
                     setOrdersDisabledMessage(j.message || null);
                  }
                  // schedule a refresh at nextToggleAt if provided
                  if (j.nextToggleAt) {
                     try {
                        const next = new Date(j.nextToggleAt).getTime();
                        const now = Date.now();
                        const delay = Math.max(0, next - now + 500);
                        setTimeout(() => {
                           if (mounted)
                              (async () => {
                                 try {
                                    const r2 = await fetch(
                                       "/api/admin/settings/orders-enabled"
                                    );
                                    if (r2.ok) {
                                       const j2 = await r2.json();
                                       setOrdersEnabled(Boolean(j2.enabled));
                                       if (typeof j2.message === "string")
                                          setOrdersDisabledMessage(
                                             j2.message || null
                                          );
                                    }
                                 } catch (e) {}
                              })();
                        }, Math.min(delay, 24 * 60 * 60 * 1000));
                     } catch (e) {}
                  }
               }
            }
         } catch (err) {
            console.warn("Failed to fetch orders_enabled flag:", err);
            if (mounted) setOrdersEnabled(true);
         }
      })();

      // Realtime subscription to site_settings changes
      const channel = supabase
         .channel("site_settings_orders_enabled")
         .on(
            "postgres_changes",
            {
               event: "*",
               schema: "public",
               table: "site_settings",
               filter: "key=eq.orders_enabled",
            },
            (payload: any) => {
               try {
                  const next = payload?.new?.value;
                  const enabled =
                     next === true ||
                     String(next) === "true" ||
                     (next && next === "true");
                  setOrdersEnabled(Boolean(enabled));
               } catch (e) {}
            }
         )
         .subscribe();

      return () => {
         mounted = false;
         try {
            supabase.removeChannel(channel);
         } catch (e) {}
      };
   }, []);

   // Keep local orderItems in sync with cart context
   useEffect(() => {
      try {
         if (effectiveIsRetry) {
            // Try restoring a lightweight cart snapshot from localStorage
            const persisted = loadCheckoutFromStorage();
            if (persisted) {
               if (persisted.cart && Array.isArray(persisted.cart)) {
                  try {
                     setOrderItems(persisted.cart);
                  } catch (e) {
                     console.warn("Failed to restore persisted cart:", e);
                  }
               }

               if (persisted.formData) {
                  setFormData((prev) => ({ ...prev, ...persisted.formData }));
               }

               if (persisted.paymentMethod) {
                  setPaymentMethod(persisted.paymentMethod);
               }
               if (persisted.mobileMoneyPhones) {
                  setMobileMoneyPhones(persisted.mobileMoneyPhones);
               }

               console.debug(
                  "CheckoutPage: Restored checkout snapshot from storage for retry mode"
               );
               return;
            }
            // If no persisted snapshot, fall through to sync from cart context
         }

         if (Array.isArray(cartItems)) {
            console.debug("CheckoutPage: Syncing cart items to order items");
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
         console.error(
            "CheckoutPage: Error syncing/restoring cart items:",
            err
         );
      }

      // Pre-fill user data if logged in (only when not in retry mode)
      if (user && !effectiveIsRetry) {
         console.debug("CheckoutPage: Pre-filling user data");
         setFormData((prev) => ({
            ...prev,
            email: user.email || "",
            firstName: user.user_metadata?.full_name?.split(" ")[0] || "",
            lastName:
               user.user_metadata?.full_name?.split(" ").slice(1).join(" ") ||
               "",
         }));
      }
   }, [cartItems, user, effectiveIsRetry]);

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

   // Redirect if cart is empty (but not in retry mode or while submitting/initiating payment)
   useEffect(() => {
      // Do not redirect while an order/payment is being processed to avoid
      // navigating the user away (e.g. to landing page) before redirecting
      // to the external payment gateway.
      if (
         orderItems.length === 0 &&
         !isRetryMode &&
         !isSubmitting &&
         !isInitiating &&
         !paymentInProgress &&
         !suppressEmptyCartRedirect
      ) {
         const timer = setTimeout(() => {
            router.push("/");
         }, 3000);
         return () => clearTimeout(timer);
      }
      return;
   }, [
      orderItems.length,
      router,
      isRetryMode,
      isSubmitting,
      isInitiating,
      paymentInProgress,
   ]);

   const subtotal = orderItems.reduce(
      (sum, item) =>
         sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0
   );

   // Debug: when retrying, log order items and subtotal to help diagnose UI showing only delivery fee
   // No debug logs here
   const selectedSectorObj = sectors.find((s) => s.sct_id === selectedSector);
   const sectorFee = selectedSectorObj
      ? (sectorsFees as any)[selectedSectorObj.sct_name]
      : undefined;
   const transport = sectorFee ?? 2000;
   const total = subtotal + transport;

   // Pre-pay gating: compute required completion flags
   const hasItems = orderItems.length > 0;
   const hasAddress = Boolean(
      (selectedAddress &&
         (selectedAddress.display_name || selectedAddress.city)) ||
         (formData.address && formData.address.trim())
   );
   const hasEmail = Boolean(formData.email && formData.email.trim());
   const phoneForCheck = (
      selectedAddress?.phone ||
      formData.phone ||
      ""
   ).toString();
   const formattedPhoneForCheck = formatPhoneNumber(phoneForCheck || "");
   const hasValidPhone = /^07\d{8}$/.test(formattedPhoneForCheck);

   // Payment selection: For pre-pay we require a non-COD method to be selected and verified
   const paymentRequiresVerification =
      paymentMethod && paymentMethod !== "cash_on_delivery";

   // If user returned from a session-based payment success (payment=success with no orderId),
   // treat the payment as verified and don't show the "Proceed to payment" button.
   const urlPaymentParam =
      typeof window !== "undefined"
         ? new URLSearchParams(window.location.search).get("payment")
         : null;
   const urlOrderIdParam =
      typeof window !== "undefined"
         ? new URLSearchParams(window.location.search).get("orderId")
         : null;
   const sessionPaymentSuccess =
      urlPaymentParam === "success" && !urlOrderIdParam;

   const allStepsCompleted =
      hasItems &&
      hasAddress &&
      hasEmail &&
      hasValidPhone &&
      // Require that the user has explicitly selected a payment method
      Boolean(paymentMethod) &&
      // If payment requires verification, user must have completed payment return + verification
      (!paymentRequiresVerification ||
         paymentVerified ||
         String(paymentMethod) === "cash_on_delivery");

   let missingSteps: string[] = [];
   if (!hasItems) missingSteps.push("Add items to your cart");
   if (!hasAddress) missingSteps.push("Select or add a delivery address");
   if (!hasEmail) missingSteps.push("Provide a valid email");
   if (!hasValidPhone) missingSteps.push("Provide a valid Rwanda phone number");
   if (!paymentMethod) missingSteps.push("Select a payment method");
   if (paymentRequiresVerification && !paymentVerified)
      missingSteps.push("Complete the payment (you will be redirected)");

   // When in retry mode we restore state from localStorage. To avoid showing
   // misleading missing-step messages while restoration completes (or when
   // the URL contains orderId=null), simplify the message: only prompt to
   // select another payment method rather than listing cart/email items.
   if (effectiveIsRetry) {
      const retryOnly: string[] = [];
      if (!paymentMethod) retryOnly.push("Select another payment method");
      missingSteps = retryOnly;
   }

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

      // First/last name are optional on the checkout form because the
      // customer's name should be derived from their user profile when
      // they're logged in. If not logged in, fallback to form values.
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

   // NOTE: Retry flows no longer rely on fetching existing orders server-side.
   // We removed server-order-dependent retry logic. The checkout now uses the
   // persisted local storage snapshot (CHECKOUT_STORAGE_KEY) and the current
   // in-memory cart to initiate a new payment session.

   // Handle order creation or retry payment
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

      // If in retry mode, we still allow the pre-pay flow using the local
      // persisted checkout snapshot instead of fetching the server order.

      // Block creation early if orders are disabled
      if (ordersEnabled === false) {
         // Prefer server-supplied message when available
         const serverMsg = ordersDisabledMessage;

         // If scheduleDisabled was returned by the server (night hours) prefer schedule translation
         // The API returns scheduleDisabled only on GET; we only have server-supplied message here.
         // Use server message first; otherwise use localized schedule key if appropriate.
         const scheduleMsg = t("checkout.ordersDisabledSchedule");
         const defaultMsg = t("checkout.ordersDisabledMessage");

         // If the server message exists, show it. If not, if server told us scheduleDisabled via message text
         // or we don't have server info, prefer schedule message when it's appropriate (we try to detect it by
         // checking the server-supplied message containing 'not working' or if localized schedule exists).
         const chosen =
            serverMsg ||
            scheduleMsg ||
            defaultMsg ||
            "Ordering is currently disabled";

         toast.error(chosen);
         setIsSubmitting(false);
         return;
      }

      try {
         const derivedCity = deriveCity();

         // Derive full name from user profile when available, otherwise fallback to form fields
         const derivedFullNameForOrder =
            user?.user_metadata?.full_name?.trim() ||
            `${formData.firstName || ""} ${formData.lastName || ""}`.trim();

         const [derivedFirstName, ...derivedLastParts] = (
            derivedFullNameForOrder || ""
         ).split(" ");
         const derivedLastName = derivedLastParts.join(" ");

         const orderData: CreateOrderRequest = {
            order: {
               user_id: user!.id,
               subtotal: subtotal,
               tax: transport,
               total: total,
               customer_email: formData.email.trim(),
               customer_first_name: (derivedFirstName || "").trim(),
               customer_last_name: (derivedLastName || "").trim(),
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
               payment_method: paymentMethod || "cash_on_delivery",
               delivery_notes:
                  (formData.delivery_notes || "").trim() || undefined,
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

         // Pre-pay flow: do NOT create an order yet. Create a server-side payment
         // session containing the cart snapshot and customer details, redirect
         // to KPay, and rely on the webhook to create the order after payment.
         // If payment was already verified in a session-based flow, create the order now
         if (
            paymentMethod &&
            paymentMethod !== "cash_on_delivery" &&
            paymentVerified
         ) {
            // Create the order now (payment already completed)
            try {
               // Prevent the empty-cart redirect while we create the order and navigate
               setSuppressEmptyCartRedirect(true);
               createOrder.mutate(orderData as CreateOrderRequest, {
                  onSuccess: async (createdOrder: any) => {
                     try {
                        clearCart();
                     } catch (e) {
                        /* ignore */
                     }
                     setOrderItems([]);

                     // Attempt to link the completed session payment to the new order
                     try {
                        let linkSucceeded = false;
                        const ref =
                           typeof window !== "undefined"
                              ? sessionStorage.getItem("kpay_reference")
                              : null;

                        if (!ref) {
                           // No reference to link — treat as success for cleanup
                           linkSucceeded = true;
                        } else {
                           console.log(
                              "Linking payment to order via reference",
                              { reference: ref, orderId: createdOrder.id }
                           );
                           // Primary linking path: server will find completed payment by reference and link
                           try {
                              const linkResp = await fetch(
                                 "/api/payments/link",
                                 {
                                    method: "POST",
                                    headers: {
                                       "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                       orderId: createdOrder.id,
                                       reference: ref,
                                    }),
                                 }
                              );
                              if (linkResp.ok) {
                                 linkSucceeded = true;
                              } else {
                                 const linkErr = await linkResp
                                    .json()
                                    .catch(() => ({}));
                                 console.warn(
                                    "/api/payments/link failed, falling back to status->PATCH",
                                    linkErr
                                 );
                                 // Fallback: query status to obtain paymentId, then PATCH link
                                 try {
                                    const statusResp = await fetch(
                                       "/api/payments/kpay/status",
                                       {
                                          method: "POST",
                                          headers: {
                                             "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                             reference: ref,
                                          }),
                                       }
                                    );
                                    if (statusResp.ok) {
                                       const statusData =
                                          await statusResp.json();
                                       const payId = statusData?.paymentId;
                                       if (payId) {
                                          const patchResp = await fetch(
                                             `/api/payments/${payId}`,
                                             {
                                                method: "PATCH",
                                                headers: {
                                                   "Content-Type":
                                                      "application/json",
                                                },
                                                body: JSON.stringify({
                                                   order_id: createdOrder.id,
                                                }),
                                             }
                                          );
                                          if (patchResp.ok) {
                                             linkSucceeded = true;
                                          } else {
                                             const pErr = await patchResp
                                                .json()
                                                .catch(() => ({}));
                                             console.error(
                                                "Failed to PATCH link payment to order",
                                                pErr
                                             );
                                          }
                                       }
                                    }
                                 } catch (fbe) {
                                    console.error(
                                       "Fallback linking path failed",
                                       fbe
                                    );
                                 }
                              }
                           } catch (linkErr) {
                              console.error(
                                 "Error linking payment via reference",
                                 linkErr
                              );
                           }
                        }
                        if (linkSucceeded) {
                           try {
                              clearAllCheckoutClientState();
                           } catch (e) {}
                        } else {
                           // Do not clear checkout snapshot — preserve user's data so they can retry
                           toast(
                              "Order created but payment linking did not complete. Your checkout data has been preserved — please check your orders page or retry linking from the payment page."
                           );
                        }

                        toast.success(
                           `Order #${createdOrder.order_number} has been created successfully!`
                        );
                        router.push(`/orders/${createdOrder.id}`);
                     } catch (outerError) {
                        console.error(
                           "Unexpected error during payment linking",
                           { orderId: createdOrder.id, error: outerError }
                        );
                        // In the unexpected error case, avoid clearing checkout snapshot
                        toast(
                           "Order created but an unexpected error occurred during payment linking. Your checkout data has been preserved."
                        );
                        router.push(`/orders/${createdOrder.id}`);
                     }
                  },
                  onError: (error: any) => {
                     console.error("createOrder.onError", error);
                     try {
                        setPaymentInProgress(false);
                     } catch (e) {
                        /* ignore */
                     }
                     toast.error(
                        `Failed to create order: ${
                           error?.message || "Unknown error"
                        }`
                     );
                  },
                  onSettled: () => {
                     setIsSubmitting(false);
                     setSuppressEmptyCartRedirect(false);
                  },
               });
            } catch (error: any) {
               console.error("Order creation failed (sync):", error);
               try {
                  setPaymentInProgress(false);
               } catch (e) {
                  /* ignore */
               }
               toast.error(
                  `Failed to create order: ${error?.message || "Unknown error"}`
               );
               setIsSubmitting(false);
            }

            return;
         }

         if (paymentMethod && paymentMethod !== "cash_on_delivery") {
            try {
               setPaymentInProgress(true);

               const customerPhone =
                  paymentMethod === "mtn_momo" ||
                  paymentMethod === "airtel_money"
                     ? mobileMoneyPhones[paymentMethod] ||
                       formatPhoneNumber(
                          selectedAddress?.phone || formData.phone || ""
                       )
                     : formatPhoneNumber(
                          selectedAddress?.phone || formData.phone || ""
                       );

               const derivedFullName =
                  user?.user_metadata?.full_name?.trim() ||
                  `${formData.firstName || ""} ${
                     formData.lastName || ""
                  }`.trim();

               const cartSnapshot = orderItems.map((it) => ({
                  product_id: (it as any).product_id || it.id,
                  name: it.name,
                  price: it.price,
                  quantity: it.quantity,
                  sku: it.sku,
                  variation_id: it.variation_id,
                  variation_name: it.variation_name,
               }));

               const paymentRequest = {
                  amount: total,
                  customerName: derivedFullName || undefined,
                  customerEmail: formData.email,
                  customerPhone,
                  paymentMethod: paymentMethod as keyof typeof PAYMENT_METHODS,
                  redirectUrl: `${window.location.origin}/checkout?payment=success`,
                  cart: cartSnapshot,
               } as any;

               const validationErrors = validatePaymentRequest(paymentRequest);
               if (validationErrors.length > 0) {
                  setPaymentInProgress(false);
                  toast.error(
                     `Payment validation failed: ${validationErrors[0]}`
                  );
                  return;
               }

               const paymentResult = await initiatePayment(paymentRequest);

               if (paymentResult.success) {
                  toast.success("Redirecting to payment gateway...");

                  if (paymentResult.reference) {
                     try {
                        sessionStorage.setItem(
                           "kpay_reference",
                           String(paymentResult.reference)
                        );
                     } catch (e) {
                        /* ignore */
                     }
                  }

                  if (paymentResult.checkoutUrl) {
                     setTimeout(
                        () =>
                           (window.location.href =
                              paymentResult.checkoutUrl as string),
                        150
                     );
                     return;
                  }
                  // For mobile-money flows (no external redirect) we should
                  // redirect the user to the local payment page which shows
                  // instructions and polls for status: /payment/[paymentId]
                  // server returns session info at `paymentResult.session` or paymentId in `paymentResult.paymentId`
                  const sessionId =
                     paymentResult.sessionId ||
                     paymentResult.paymentId ||
                     paymentResult.session?.id;

                  if (sessionId) {
                     try {
                        sessionStorage.setItem(
                           "kpay_reference",
                           String(paymentResult.reference)
                        );
                     } catch (e) {}

                     // Redirect to our internal payment status page which provides helpful instructions
                     setTimeout(
                        () => router.push(`/payment/${sessionId}`),
                        150
                     );
                     return;
                  }

                  // If there's no session id (unexpected), fallback to keeping cart and polling by reference
                  if (paymentResult.reference) {
                     try {
                        sessionStorage.setItem(
                           "kpay_reference",
                           String(paymentResult.reference)
                        );
                     } catch (e) {}
                  }

                  toast.success(
                     "Payment started. Awaiting confirmation — please complete the payment on your phone."
                  );
                  // Start polling immediately using the existing effect which reads sessionStorage
                  return;
               } else {
                  setPaymentInProgress(false);
                  toast.error(
                     `Payment initiation failed: ${
                        paymentResult.error || "Unknown error"
                     }`
                  );
                  return;
               }
            } catch (err) {
               console.error("Session-based payment initiation failed:", err);
               setPaymentInProgress(false);
               toast.error("Failed to start payment. Please try again.");
               return;
            }
         }

         // Cash on delivery: create the order now
         // Prevent the empty-cart redirect while we create the order and navigate
         setSuppressEmptyCartRedirect(true);
         createOrder.mutate(orderData as CreateOrderRequest, {
            onSuccess: async (createdOrder: any) => {
               try {
                  clearCart();
               } catch (e) {
                  /* ignore */
               }
               setOrderItems([]);
               // Clear persisted checkout and session state now that order is created
               try {
                  clearAllCheckoutClientState();
               } catch (e) {}
               toast.success(
                  `Order #${createdOrder.order_number} has been created successfully!`
               );
               router.push(`/orders/${createdOrder.id}`);
            },
            onError: (error: any) => {
               console.error("createOrder.onError", error);
               try {
                  setPaymentInProgress(false);
               } catch (e) {
                  /* ignore */
               }
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
               setSuppressEmptyCartRedirect(false);
            },
         });
      } catch (error: any) {
         console.error("Order creation failed (sync):", error);
         try {
            setPaymentInProgress(false);
         } catch (e) {
            /* ignore */
         }
         toast.error(
            `Failed to create order: ${error?.message || "Unknown error"}`
         );
         setIsSubmitting(false);
      }
   };

   const generateWhatsAppMessage = () => {
      const productDetails = orderItems
         .map((item) => {
            // Prefer explicit product_id when available, otherwise use item.id
            const productId = (item as any).product_id || item.id || "";
            const productLink = `https://nihemart.rw/products/${productId}`;

            const lines: string[] = [];
            // Line 1: product name (variation) x qty - total
            lines.push(
               `${item.name}${
                  item.variation_name ? ` (${item.variation_name})` : ""
               } x${item.quantity} - ${(
                  item.price * item.quantity
               ).toLocaleString()} RWF`
            );

            // SKU line if available
            if (item.sku) lines.push(`SKU: ${item.sku}`);

            // Variation id if present
            if ((item as any).variation_id)
               lines.push(`Variation ID: ${(item as any).variation_id}`);

            // Product link
            lines.push(`Link: ${productLink}`);

            return lines.join("\n");
         })
         .join("\n\n");

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

      // Updated WhatsApp number (international format without +)
      const phoneNumber = "250792412177";
      const message = generateWhatsAppMessage();
      const url = `https://wa.me/${phoneNumber}?text=${message}`;
      window.open(url, "_blank");
   };

   // Show empty cart message (but not in retry mode)
   if (orderItems.length === 0 && !isRetryMode) {
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
            {isRetryMode
               ? "Retry Payment with Different Method"
               : t("checkout.title")}
         </h1>

         {/* Persistent banner at top showing missing steps */}
         {missingSteps.length > 0 && (
            <div className="sticky top-4 z-40 mb-4">
               <div className="mx-auto max-w-[90vw] sm:max-w-7xl px-2 sm:px-0">
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-800 shadow-sm">
                     <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                           <div className="font-semibold text-sm">
                              Please complete the following before placing your
                              order:
                           </div>
                           <ul className="mt-1 text-sm list-disc pl-5 space-y-0.5">
                              {missingSteps.map((m) => (
                                 <li key={m}>{m}</li>
                              ))}
                           </ul>
                        </div>
                        <div className="flex-shrink-0">
                           <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                 // Scroll to order section to help the user
                                 const el = document.querySelector(
                                    "[data-checkout-order-section]"
                                 );
                                 if (el) {
                                    (el as HTMLElement).scrollIntoView({
                                       behavior: "smooth",
                                       block: "center",
                                    });
                                 }
                              }}
                           >
                              Take me there
                           </Button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* Retry mode banner (generic) */}
         {isRetryMode && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
               <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                     <p className="text-sm font-medium text-blue-900">
                        Retry Payment
                     </p>
                     <p className="text-xs text-blue-700 mt-1">
                        Previous payment failed or timed out. Choose a different
                        payment method below. Your cart and delivery details
                        were restored from your browser.
                     </p>
                     <div className="mt-2 text-xs text-blue-800">
                        <div>Amount: RWF {Number(total).toLocaleString()}</div>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {isRetryMode && retryTimedOut && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
               <p className="text-xs text-yellow-900">
                  The previous payment attempt timed out. You can try a
                  different payment method now.
               </p>
            </div>
         )}

         {/* Loading existing order */}
         {/* No server-side order loading in retry mode; state is restored from localStorage */}

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
                        <PaymentMethodSelector
                           selectedMethod={paymentMethod as any}
                           onMethodChange={setPaymentMethod}
                           disabled={isSubmitting || isInitiating}
                           // Mobile Money
                           onMobileMoneyPhoneChange={
                              handleMobileMoneyPhoneChange
                           }
                           mobileMoneyPhones={mobileMoneyPhones}
                        />
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
                           {ordersEnabled === false && (
                              <div className="mb-3 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-900 text-sm">
                                 {t("checkout.ordersDisabledBanner") ||
                                    "Ordering is currently disabled by the admin."}
                              </div>
                           )}
                           {isKigali ? (
                              isLoggedIn ? (
                                 <div className="space-y-2">
                                    {/* Missing steps are shown in the persistent top banner */}

                                    {/* For non-COD methods: allow proceeding to payment (creates order + initiates payment)
                                        but only enable if basic fields are present (not requiring paymentVerified). */}
                                    {paymentMethod &&
                                    paymentMethod !== "cash_on_delivery" ? (
                                       <>
                                          {!sessionPaymentSuccess && (
                                             <Button
                                                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base h-10 sm:h-12"
                                                onClick={() => {
                                                   const disabled =
                                                      isSubmitting ||
                                                      isInitiating ||
                                                      !hasItems ||
                                                      !hasAddress ||
                                                      !hasEmail ||
                                                      !hasValidPhone ||
                                                      !paymentMethod;
                                                   if (disabled) {
                                                      if (
                                                         missingSteps.length > 0
                                                      ) {
                                                         toast.error(
                                                            `Please complete: ${missingSteps.join(
                                                               ", "
                                                            )}`
                                                         );
                                                      } else {
                                                         toast.error(
                                                            "Please complete all required steps before proceeding to payment."
                                                         );
                                                      }
                                                      return;
                                                   }

                                                   handleCreateOrder();
                                                }}
                                                disabled={
                                                   isSubmitting ||
                                                   isInitiating ||
                                                   !hasItems ||
                                                   !hasAddress ||
                                                   !hasEmail ||
                                                   !hasValidPhone ||
                                                   !paymentMethod
                                                }
                                             >
                                                {isSubmitting ||
                                                isInitiating ? (
                                                   <>
                                                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                                                      {isInitiating
                                                         ? "Initiating Payment..."
                                                         : t(
                                                              "checkout.processing"
                                                           )}
                                                   </>
                                                ) : (
                                                   <>
                                                      <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                                      {isRetryMode
                                                         ? "Pay with Different Method"
                                                         : "Proceed to payment"}
                                                   </>
                                                )}
                                             </Button>
                                          )}

                                          {/* Finalize button: disabled until paymentVerified */}
                                          {/* Finalize button: disabled until paymentVerified (for pre-pay) or until allStepsCompleted for COD */}
                                          <div className="mt-2">
                                             <button
                                                className={`w-full mt-2 h-10 sm:h-12 text-sm sm:text-base font-medium rounded-md border px-3 py-2 transition-colors ${
                                                   paymentRequiresVerification
                                                      ? paymentVerified
                                                         ? "bg-orange-500 text-white hover:bg-orange-600 border-transparent"
                                                         : "bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed"
                                                      : allStepsCompleted
                                                      ? "bg-orange-500 text-white hover:bg-orange-600 border-transparent"
                                                      : "bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed"
                                                }`}
                                                onClick={() => {
                                                   // If disabled, surface a helpful message
                                                   const disabled =
                                                      paymentRequiresVerification
                                                         ? !paymentVerified
                                                         : !allStepsCompleted;
                                                   if (disabled) {
                                                      if (
                                                         missingSteps.length > 0
                                                      ) {
                                                         toast.error(
                                                            `Please complete: ${missingSteps.join(
                                                               ", "
                                                            )}`
                                                         );
                                                      } else if (
                                                         paymentRequiresVerification &&
                                                         !paymentVerified
                                                      ) {
                                                         toast.error(
                                                            "Please complete the payment before placing the order."
                                                         );
                                                      } else {
                                                         toast.error(
                                                            "Please complete all required steps before placing your order."
                                                         );
                                                      }
                                                      return;
                                                   }

                                                   const oid =
                                                      paymentReturnedOrderId ||
                                                      effectiveRetryOrderId;
                                                   if (oid) {
                                                      router.push(
                                                         `/orders/${oid}`
                                                      );
                                                      return;
                                                   }

                                                   // If payment was already verified (session-based) but
                                                   // no order exists yet, create the order now.
                                                   if (
                                                      paymentRequiresVerification &&
                                                      paymentVerified &&
                                                      !oid
                                                   ) {
                                                      try {
                                                         handleCreateOrder();
                                                      } catch (e) {
                                                         console.error(
                                                            "Place Order (create) failed:",
                                                            e
                                                         );
                                                         toast.error(
                                                            "Failed to place order. Please try again."
                                                         );
                                                      }
                                                   }
                                                }}
                                                // Make the button truly disabled for assistive tech and interaction
                                                disabled={
                                                   paymentRequiresVerification
                                                      ? !paymentVerified
                                                      : !allStepsCompleted
                                                }
                                                aria-disabled={
                                                   paymentRequiresVerification
                                                      ? !paymentVerified
                                                      : !allStepsCompleted
                                                }
                                                title={
                                                   missingSteps.length > 0
                                                      ? `Please complete: ${missingSteps.join(
                                                           ", "
                                                        )}`
                                                      : undefined
                                                }
                                                aria-describedby={
                                                   missingSteps.length > 0
                                                      ? "checkout-missing-steps"
                                                      : undefined
                                                }
                                             >
                                                {paymentRequiresVerification
                                                   ? paymentVerified
                                                      ? "Place Order"
                                                      : "Place Order (complete payment first)"
                                                   : allStepsCompleted
                                                   ? "Place Order"
                                                   : "Place Order (complete all steps)"}
                                             </button>

                                             {/* Hidden accessible region describing missing steps */}
                                             {missingSteps.length > 0 && (
                                                <div
                                                   id="checkout-missing-steps"
                                                   className="sr-only"
                                                >
                                                   {missingSteps.join(". ")}
                                                </div>
                                             )}
                                          </div>
                                       </>
                                    ) : (
                                       // Cash on delivery: single action creates the order immediately
                                       <>
                                          <Button
                                             className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base h-10 sm:h-12"
                                             onClick={handleCreateOrder}
                                             disabled={
                                                isSubmitting ||
                                                isInitiating ||
                                                !allStepsCompleted
                                             }
                                          >
                                             {isSubmitting || isInitiating ? (
                                                <>
                                                   <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                                                   {isInitiating
                                                      ? "Processing..."
                                                      : t(
                                                           "checkout.processing"
                                                        )}
                                                </>
                                             ) : (
                                                <>
                                                   <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                                   {t("checkout.placeOrder") ||
                                                      "Place Order"}
                                                </>
                                             )}
                                          </Button>
                                       </>
                                    )}
                                 </div>
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
                           ) : // If no delivery address exists/selected, show an inert "Order Now" button
                           !hasAddress ? (
                              <Button
                                 variant="outline"
                                 className="w-full border-orange-300 text-orange-600 hover:bg-orange-50 text-sm sm:text-base h-10 sm:h-12"
                                 disabled={true}
                              >
                                 Order Now
                              </Button>
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

export default CheckoutPage;

"use client";
import { useCallback } from "react";

export default function useSubmitOrder(args: any) {
   const submit = useCallback(async () => {
      const {
         isSubmitting,
         setPaymentFailure,
         validateForm,
         setErrors,
         toast,
         t,
         deriveCity,
         subtotal,
         transport,
         total,
         formData,
         orderItems,
         setIsSubmitting,
         ordersEnabled,
         ordersSource,
         scheduleConfirmChecked,
         setPaymentInProgress,
         mobileMoneyPhones,
         formatPhoneNumber,
         initiatePayment,
         createOrder,
         setSuppressEmptyCartRedirect,
         setPreventPersistence,
         clearAllCheckoutClientState,
         clearCart,
         setOrderItems,
         user,
         router,
         validatePaymentRequest,
         selectedAddress,
      } = args;

      // Track whether we've navigated to an order page so the checkout
      // empty-cart redirect doesn't race and send users back to the landing
      // page after a successful navigation to the order details page.
      let navigatedToOrder = false;

      if (isSubmitting) return;

      try {
         try {
            setPaymentFailure && setPaymentFailure(null);
         } catch (e) {}

         const formErrors = validateForm ? validateForm() : {};
         if (formErrors && Object.keys(formErrors).length > 0) {
            setErrors && setErrors(formErrors);
            const msgs = Object.values(formErrors).filter(Boolean);
            if (msgs.length > 0) {
               toast.error(String(msgs[0]));
            } else {
               toast.error("Please fix the highlighted errors and try again.");
            }
            return;
         }

         if (!orderItems || orderItems.length === 0) {
            toast.error(t("cart.empty"));
            return;
         }

         setIsSubmitting && setIsSubmitting(true);
         setErrors && setErrors({});

         if (ordersEnabled === false) {
            if (ordersSource === "admin") {
               toast.error(
                  args.ordersDisabledMessage ||
                     t("checkout.ordersDisabledMessage") ||
                     "Ordering is currently disabled by the admin."
               );
               setIsSubmitting && setIsSubmitting(false);
               return;
            }

            if (ordersSource === "schedule") {
               if (!scheduleConfirmChecked) {
                  toast.error(
                     t("checkout.confirmScheduleDelivery") ||
                        "Please confirm you want this order delivered tomorrow during working hours."
                  );
                  setIsSubmitting && setIsSubmitting(false);
                  return;
               }
            }
         }

         try {
            const derivedCity = deriveCity ? deriveCity() : "";

            const derivedFullNameForOrder =
               (user &&
                  user.user_metadata &&
                  user.user_metadata.full_name &&
                  user.user_metadata.full_name.trim()) ||
               `${formData.fullName || ""}`.trim();

            const [derivedFirstName, ...derivedLastParts] = (
               derivedFullNameForOrder || ""
            ).split(" ");
            const derivedLastName = derivedLastParts.join(" ");

            const orderData: any = {
               order: {
                  user_id: user?.id || undefined,
                  subtotal: subtotal,
                  tax: transport,
                  total: total,
                  customer_email: (formData.email || "").trim(),
                  customer_first_name: (derivedFirstName || "").trim(),
                  customer_last_name: (derivedLastName || "").trim(),
                  customer_phone:
                     (
                        (args.selectedAddress?.phone ||
                           formData.phone ||
                           "") as string
                     ).trim() || undefined,
                  delivery_address: (
                     (args.selectedAddress?.street ??
                        args.selectedAddress?.display_name ??
                        formData.address ??
                        "") as string
                  ).trim(),
                  delivery_city: (
                     (derivedCity ||
                        args.selectedAddress?.city ||
                        formData.city ||
                        "") as string
                  ).trim(),
                  status: "pending",
                  payment_method: args.paymentMethod || "cash_on_delivery",
                  delivery_notes:
                     (formData.delivery_notes || "").trim() || undefined,
               },
               items: orderItems.map((item: any) => {
                  const explicitProductId = item.product_id as
                     | string
                     | undefined;
                  let resolvedProductId: string | undefined = explicitProductId;
                  if (!resolvedProductId && typeof item.id === "string") {
                     const idStr = item.id as string;
                     if (idStr.length === 36) resolvedProductId = idStr;
                     else if (idStr.length >= 73 && idStr[36] === "-")
                        resolvedProductId = idStr.slice(0, 36);
                     else resolvedProductId = idStr;
                  }
                  const product_id = resolvedProductId ?? String(item.id);
                  return {
                     product_id,
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

            if (formData.delivery_notes)
               orderData.order.delivery_notes = formData.delivery_notes;

            if (
               ordersEnabled === false &&
               ordersSource === "schedule" &&
               args.scheduleNotes
            ) {
               try {
                  // Store schedule notes in a dedicated field so they are
                  // easier to query and display separately from generic
                  // delivery instructions.
                  orderData.order.schedule_notes = (
                     (args.scheduleNotes || "") as string
                  ).trim();
               } catch (e) {
                  console.warn("Failed to set schedule_notes:", e);
               }
            }

            // When orders are disabled by schedule and the customer confirmed
            // delivery for the next working day, provide a server-validated
            // `delivery_time` timestamp. Server expects a delivery_time that
            // maps to the next calendar day in Kigali local time. We construct
            // an ISO timestamp that represents 10:00 AM Kigali (UTC+2) on the
            // next calendar day so server-side validation passes reliably.
            try {
               if (
                  ordersEnabled === false &&
                  ordersSource === "schedule" &&
                  scheduleConfirmChecked
               ) {
                  // Kigali offset (UTC+2)
                  const KIGALI_OFFSET_HOURS = 2;
                  const OFFSET_MS = KIGALI_OFFSET_HOURS * 60 * 60 * 1000;
                  const now = Date.now();
                  const kigaliMs = now + OFFSET_MS;
                  const kigaliDate = new Date(kigaliMs);
                  const kYear = kigaliDate.getUTCFullYear();
                  const kMonth = kigaliDate.getUTCMonth();
                  const kDate = kigaliDate.getUTCDate();

                  // Build a UTC timestamp that corresponds to 10:00 AM Kigali
                  // on the *next* calendar day. 10:00 Kigali == 08:00 UTC.
                  const deliveryUtcMs = Date.UTC(
                     kYear,
                     kMonth,
                     kDate + 1,
                     8,
                     0,
                     0,
                     0
                  );
                  const deliveryIso = new Date(deliveryUtcMs).toISOString();
                  orderData.order.delivery_time = deliveryIso;
               }
            } catch (e) {
               console.warn(
                  "Failed to compute delivery_time for scheduled order:",
                  e
               );
            }

            if (!createOrder || typeof createOrder.mutate !== "function") {
               console.error(
                  "createOrder mutation is not available",
                  createOrder
               );
               toast.error(
                  "Unable to submit order right now. Please try again later."
               );
               setIsSubmitting && setIsSubmitting(false);
               return;
            }

            // If paymentMethod indicates payment already verified, create order immediately and attempt linking
            if (
               args.paymentMethod &&
               args.paymentMethod !== "cash_on_delivery" &&
               args.paymentVerified
            ) {
               try {
                  setSuppressEmptyCartRedirect &&
                     setSuppressEmptyCartRedirect(true);
                  setPreventPersistence && setPreventPersistence(true);
                  createOrder.mutate(orderData, {
                     onSuccess: async (createdOrder: any) => {
                        const created =
                           createdOrder && createdOrder.order
                              ? createdOrder.order
                              : createdOrder;
                        try {
                           clearCart && clearCart();
                        } catch (e) {}
                        setOrderItems && setOrderItems([]);

                        try {
                           let linkSucceeded = false;
                           const ref =
                              typeof window !== "undefined"
                                 ? sessionStorage.getItem("kpay_reference")
                                 : null;
                           if (!ref) linkSucceeded = true;
                           else {
                              try {
                                 const linkResp = await fetch(
                                    "/api/payments/link",
                                    {
                                       method: "POST",
                                       headers: {
                                          "Content-Type": "application/json",
                                       },
                                       body: JSON.stringify({
                                          orderId: created.id,
                                          reference: ref,
                                       }),
                                    }
                                 );
                                 if (linkResp.ok) linkSucceeded = true;
                                 else {
                                    const linkErr = await linkResp
                                       .json()
                                       .catch(() => ({}));
                                    try {
                                       const statusResp = await fetch(
                                          "/api/payments/kpay/status",
                                          {
                                             method: "POST",
                                             headers: {
                                                "Content-Type":
                                                   "application/json",
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
                                                      order_id: created.id,
                                                   }),
                                                }
                                             );
                                             if (patchResp.ok)
                                                linkSucceeded = true;
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

                           try {
                              clearAllCheckoutClientState &&
                                 clearAllCheckoutClientState();
                           } catch (e) {
                              console.error(
                                 "Failed to clear checkout state:",
                                 e
                              );
                           }

                           if (!linkSucceeded) {
                              toast(
                                 "Order created but payment linking did not complete. Please check your orders page."
                              );
                           }

                           // Guests cannot manage orders — redirect immediately
                           if (user && (user as any).id) {
                              try {
                                 console.debug(
                                    "useSubmitOrder: navigating to user order page",
                                    (created as any)?.id
                                 );
                                 await router.push(
                                    `/orders/${(created as any)?.id}`
                                 );
                              } catch (navErr) {
                                 console.error(
                                    "Navigation to /orders/:id failed:",
                                    navErr
                                 );
                              }
                           } else {
                              try {
                                 // Attempt to send confirmation email reliably while navigating.
                                 const payload = JSON.stringify({
                                    order: created,
                                 });
                                 try {
                                    // Prefer navigator.sendBeacon so navigation isn't blocked
                                    if (
                                       typeof window !== "undefined" &&
                                       typeof navigator !== "undefined" &&
                                       typeof navigator.sendBeacon ===
                                          "function"
                                    ) {
                                       const url =
                                          window.location.origin +
                                          "/api/orders/send-confirmation-email";
                                       const blob = new Blob([payload], {
                                          type: "application/json",
                                       });
                                       try {
                                          navigator.sendBeacon(
                                             url,
                                             blob as any
                                          );
                                       } catch (e) {
                                          // fall through to fetch
                                          fetch(url, {
                                             method: "POST",
                                             headers: {
                                                "Content-Type":
                                                   "application/json",
                                             },
                                             body: payload,
                                             keepalive: true as any,
                                          }).catch(() => {});
                                       }
                                    } else {
                                       // Fallback to keepalive fetch
                                       fetch(
                                          "/api/orders/send-confirmation-email",
                                          {
                                             method: "POST",
                                             headers: {
                                                "Content-Type":
                                                   "application/json",
                                             },
                                             body: payload,
                                             keepalive: true as any,
                                          }
                                       ).catch(() => {});
                                    }
                                 } catch (e) {}

                                 // Navigate first for immediate UX
                                 try {
                                    console.debug(
                                       "useSubmitOrder: navigating to /thank-you for guest"
                                    );
                                    await router.push(`/thank-you`);
                                 } catch (navErr) {
                                    console.error(
                                       "Navigation to /thank-you failed:",
                                       navErr
                                    );
                                 }
                              } catch (e) {
                                 // ignore navigation errors
                              }

                              // Fire-and-forget cleanup to avoid delaying redirect
                              setTimeout(() => {
                                 try {
                                    toast.success(
                                       `Order #${
                                          (created as any).order_number
                                       } has been created successfully!`
                                    );
                                 } catch (e) {}
                                 try {
                                    clearAllCheckoutClientState &&
                                       clearAllCheckoutClientState();
                                 } catch (e) {}
                                 try {
                                    clearCart && clearCart();
                                 } catch (e) {}
                                 try {
                                    setOrderItems && setOrderItems([]);
                                 } catch (e) {}
                              }, 0);
                           }
                        } catch (outerError) {
                           console.error(
                              "Unexpected error during payment linking",
                              {
                                 orderId: (created as any)?.id,
                                 error: outerError,
                              }
                           );
                           // Navigate immediately for guests, then run cleanup
                           try {
                              if (user && (user as any).id) {
                                 navigatedToOrder = true;
                                 router.push(`/orders/${(created as any)?.id}`);
                              } else {
                                 router.push(`/thank-you`);
                              }
                           } catch (e) {}
                           try {
                              toast(
                                 "Order created but an unexpected error occurred during payment linking. Your checkout data has been preserved."
                              );
                           } catch (e) {}
                        }
                     },
                     onError: (error: any) => {
                        console.error("createOrder.onError", error);
                        try {
                           setPaymentInProgress && setPaymentInProgress(false);
                        } catch (e) {}
                        setPreventPersistence && setPreventPersistence(false);
                        toast.error(
                           `Failed to create order: ${
                              error?.message || "Unknown error"
                           }`
                        );
                     },
                     onSettled: () => {
                        setIsSubmitting && setIsSubmitting(false);
                        if (!navigatedToOrder) {
                           setSuppressEmptyCartRedirect &&
                              setSuppressEmptyCartRedirect(false);
                        }
                     },
                  });
               } catch (error: any) {
                  console.error("Order creation failed (sync):", error);
                  try {
                     setPaymentInProgress && setPaymentInProgress(false);
                  } catch (e) {}
                  toast.error(
                     `Failed to create order: ${
                        error?.message || "Unknown error"
                     }`
                  );
                  setIsSubmitting && setIsSubmitting(false);
               }

               return;
            }

            // Initiate session-based or gateway payment if not COD
            if (
               args.paymentMethod &&
               args.paymentMethod !== "cash_on_delivery"
            ) {
               try {
                  setPaymentInProgress && setPaymentInProgress(true);

                  const customerPhone =
                     args.paymentMethod === "mtn_momo" ||
                     args.paymentMethod === "airtel_money"
                        ? mobileMoneyPhones[args.paymentMethod] ||
                          formatPhoneNumber(
                             args.selectedAddress?.phone || formData.phone || ""
                          )
                        : formatPhoneNumber(
                             args.selectedAddress?.phone || formData.phone || ""
                          );

                  const derivedFullName =
                     (user &&
                        user.user_metadata &&
                        user.user_metadata.full_name &&
                        user.user_metadata.full_name.trim()) ||
                     `${formData.fullName || ""}`.trim();

                  const cartSnapshot = orderItems.map((it: any) => ({
                     product_id: it.product_id || it.id,
                     name: it.name,
                     price: it.price,
                     quantity: it.quantity,
                     sku: it.sku,
                     variation_id: it.variation_id,
                     variation_name: it.variation_name,
                  }));

                  const paymentRequest: any = {
                     amount: total,
                     customerName: derivedFullName || undefined,
                     customerEmail: formData.email,
                     customerPhone,
                     paymentMethod: args.paymentMethod,
                     redirectUrl: `${window.location.origin}/checkout?payment=success`,
                     cart: cartSnapshot,
                  };

                  const validationErrors = validatePaymentRequest
                     ? validatePaymentRequest(paymentRequest)
                     : [];
                  if (validationErrors.length > 0) {
                     setPaymentInProgress && setPaymentInProgress(false);
                     toast.error(
                        `Payment validation failed: ${validationErrors[0]}`
                     );
                     return;
                  }

                  const paymentResult = await initiatePayment(paymentRequest);

                  if (paymentResult.success) {
                     toast.success("Redirecting to payment gateway...");

                     const ref =
                        paymentResult.reference ||
                        paymentResult.session?.reference ||
                        null;
                     if (ref) {
                        try {
                           sessionStorage.setItem(
                              "kpay_reference",
                              String(ref)
                           );
                        } catch (e) {}
                     }

                     if (paymentResult.checkoutUrl) {
                        window.location.href = String(
                           paymentResult.checkoutUrl
                        );
                        return;
                     }

                     const sessionId =
                        paymentResult.sessionId ||
                        paymentResult.paymentId ||
                        paymentResult.session?.id;
                     if (sessionId) {
                        try {
                           router.push(`/payment/${sessionId}`);
                           return;
                        } catch (e) {
                           window.location.href = `${window.location.origin}/payment/${sessionId}`;
                           return;
                        }
                     }

                     toast.error(
                        "Payment started but no redirect information was provided. Please check your payments page or contact support."
                     );
                     setPaymentInProgress && setPaymentInProgress(false);
                     return;
                  } else {
                     setPaymentInProgress && setPaymentInProgress(false);
                     toast.error(
                        `Payment initiation failed: ${
                           paymentResult.error || "Unknown error"
                        }`
                     );
                     return;
                  }
               } catch (err) {
                  console.error(
                     "Session-based payment initiation failed:",
                     err
                  );
                  setPaymentInProgress && setPaymentInProgress(false);
                  toast.error("Failed to start payment. Please try again.");
                  return;
               }
            }

            // Cash on delivery: create the order now
            setSuppressEmptyCartRedirect && setSuppressEmptyCartRedirect(true);
            createOrder.mutate(orderData, {
               onSuccess: async (createdOrder: any) => {
                  const created =
                     createdOrder && createdOrder.order
                        ? createdOrder.order
                        : createdOrder;
                  setPreventPersistence && setPreventPersistence(true);
                  try {
                     clearAllCheckoutClientState &&
                        clearAllCheckoutClientState();
                  } catch (e) {
                     console.error("Failed to clear checkout state:", e);
                  }

                  try {
                     clearCart && clearCart();
                  } catch (e) {
                     console.error("Failed to clear cart:", e);
                  }

                  setOrderItems && setOrderItems([]);

                  // Redirect guests immediately, then cleanup asynchronously
                  if (user && (user as any).id) {
                     try {
                        console.debug(
                           "useSubmitOrder: navigating to user order page (COD)",
                           created?.id
                        );
                        navigatedToOrder = true;
                        await router.push(`/orders/${created?.id}`);
                     } catch (navErr) {
                        console.error(
                           "Navigation to /orders/:id failed:",
                           navErr
                        );
                     }
                     try {
                        toast.success(
                           `Order #${created.order_number} has been created successfully!`
                        );
                     } catch (e) {}
                  } else {
                     try {
                        console.debug(
                           "useSubmitOrder: navigating to /thank-you for guest (COD)"
                        );
                        await router.push(`/thank-you`);
                     } catch (navErr) {
                        console.error(
                           "Navigation to /thank-you failed:",
                           navErr
                        );
                     }
                     setTimeout(() => {
                        try {
                           toast.success(
                              `Order #${created.order_number} has been created successfully!`
                           );
                        } catch (e) {}
                     }, 0);
                  }
               },
               onError: (error: any) => {
                  console.error("createOrder.onError", error);
                  try {
                     setPaymentInProgress && setPaymentInProgress(false);
                  } catch (e) {}
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
                  setIsSubmitting && setIsSubmitting(false);
                  if (!navigatedToOrder) {
                     setSuppressEmptyCartRedirect &&
                        setSuppressEmptyCartRedirect(false);
                  }
               },
            });
         } catch (error: any) {
            console.error("Order creation failed (sync):", error);
            try {
               setPaymentInProgress && setPaymentInProgress(false);
            } catch (e) {}
            toast.error(
               `Failed to create order: ${error?.message || "Unknown error"}`
            );
            setIsSubmitting && setIsSubmitting(false);
         }
      } catch (err) {
         console.error("Unhandled error in submit order:", err);
         setIsSubmitting && setIsSubmitting(false);
         toast.error("Failed to submit order. Please try again.");
      }
   }, [args]);

   return submit;
}

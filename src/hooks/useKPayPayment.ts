import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { PAYMENT_METHODS } from "@/lib/services/kpay";

export interface PaymentInitiationRequest {
   orderId: string;
   amount: number;
   customerName: string;
   customerEmail: string;
   customerPhone: string;
   paymentMethod: keyof typeof PAYMENT_METHODS;
   redirectUrl: string;
}

export interface PaymentInitiationResponse {
   success: boolean;
   paymentId: string;
   transactionId: string;
   reference: string;
   checkoutUrl?: string;
   status: string;
   message: string;
   error?: string;
}

export interface PaymentStatusResponse {
   success: boolean;
   paymentId: string;
   status: string;
   amount: number;
   currency: string;
   reference: string;
   transactionId?: string;
   message: string;
   needsUpdate: boolean;
   error?: string;
   kpayStatus?: {
      statusId: string;
      statusDescription: string;
      returnCode: number;
      momTransactionId?: string;
   };
}

export function useKPayPayment() {
   const [isInitiating, setIsInitiating] = useState(false);
   const [isCheckingStatus, setIsCheckingStatus] = useState(false);
   // refs to avoid stale closures and prevent concurrent requests
   const initiatingRef = useRef(false);
   const checkingRef = useRef(false);

   const initiatePayment = useCallback(
      async (
         request: PaymentInitiationRequest
      ): Promise<PaymentInitiationResponse> => {
         if (initiatingRef.current) {
            const msg = "A payment is already in progress. Please wait.";
            toast.error(msg);
            return {
               success: false,
               paymentId: "",
               transactionId: "",
               reference: "",
               status: "failed",
               message: msg,
               error: msg,
            };
         }

         initiatingRef.current = true;
         setIsInitiating(true);

         try {
            const response = await fetch("/api/payments/kpay/initiate", {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
               },
               body: JSON.stringify(request),
            });

            const data = await response.json();

            if (!response.ok) {
               throw new Error(data.error || "Failed to initiate payment");
            }

            if (data.success) {
               toast.success("Payment initiated successfully");
            } else {
               toast.error(data.error || "Payment initiation failed");
            }

            return data;
         } catch (error) {
            const errorMessage =
               error instanceof Error
                  ? error.message
                  : "Payment initiation failed";
            toast.error(errorMessage);

            return {
               success: false,
               paymentId: "",
               transactionId: "",
               reference: "",
               status: "failed",
               message: errorMessage,
               error: errorMessage,
            };
         } finally {
            initiatingRef.current = false;
            setIsInitiating(false);
         }
      },
      []
   );

   const checkPaymentStatus = useCallback(
      async (params: {
         paymentId?: string;
         transactionId?: string;
         reference?: string;
      }): Promise<PaymentStatusResponse> => {
         if (checkingRef.current) {
            return {
               success: false,
               paymentId: params.paymentId || "",
               status: "unknown",
               amount: 0,
               currency: "RWF",
               reference: params.reference || "",
               transactionId: params.transactionId,
               message: "Status check already in progress",
               needsUpdate: false,
               error: "Status check already in progress",
            };
         }

         checkingRef.current = true;
         setIsCheckingStatus(true);

         try {
            const response = await fetch("/api/payments/kpay/status", {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
               },
               body: JSON.stringify(params),
            });

            const data = await response.json();

            if (!response.ok) {
               throw new Error(data.error || "Failed to check payment status");
            }

            return data;
         } catch (error) {
            const errorMessage =
               error instanceof Error
                  ? error.message
                  : "Failed to check payment status";

            return {
               success: false,
               paymentId: params.paymentId || "",
               status: "unknown",
               amount: 0,
               currency: "RWF",
               reference: params.reference || "",
               transactionId: params.transactionId,
               message: errorMessage,
               needsUpdate: false,
               error: errorMessage,
            };
         } finally {
            checkingRef.current = false;
            setIsCheckingStatus(false);
         }
      },
      []
   );

   const formatPhoneNumber = useCallback((phone: string): string => {
      // Remove all non-digit characters except +
      const cleaned = phone.replace(/[^\d+]/g, "");

      // If already in 07XXXXXXXX format, return as is (preferred by KPay)
      if (/^07\d{8}$/.test(cleaned)) {
         return cleaned;
      }

      // If starts with +250, convert to 07XXXXXXXX
      if (cleaned.startsWith("+250")) {
         const digits = cleaned.substring(4);
         if (digits.length === 9 && digits.startsWith("7")) {
            return `0${digits}`;
         }
      }

      // If starts with 250, convert to 07XXXXXXXX
      if (cleaned.startsWith("250")) {
         const digits = cleaned.substring(3);
         if (digits.length === 9 && digits.startsWith("7")) {
            return `0${digits}`;
         }
      }

      // If 9 digits starting with 7, add 0 prefix
      if (cleaned.length === 9 && cleaned.startsWith("7")) {
         return `0${cleaned}`;
      }

      return cleaned;
   }, []);

   const validatePaymentRequest = useCallback(
      (request: PaymentInitiationRequest): string[] => {
         const errors: string[] = [];

         if (!request.orderId) {
            errors.push("Order ID is required");
         }

         if (!request.amount || request.amount <= 0) {
            errors.push("Valid amount is required");
         }

         if (!request.customerName?.trim()) {
            errors.push("Customer name is required");
         }

         if (!request.customerEmail?.trim()) {
            errors.push("Customer email is required");
         }

         if (!request.customerPhone?.trim()) {
            errors.push("Customer phone is required");
         } else {
            // Validate phone format
            const formattedPhone = formatPhoneNumber(request.customerPhone);
            if (!formattedPhone.match(/^07\d{8}$/)) {
               errors.push(
                  "Phone number must be in Rwanda format (07XXXXXXXX)"
               );
            }
         }

         if (!request.paymentMethod) {
            errors.push("Payment method is required");
         } else if (!PAYMENT_METHODS[request.paymentMethod]) {
            errors.push("Invalid payment method");
         }

         if (!request.redirectUrl?.trim()) {
            errors.push("Redirect URL is required");
         }

         return errors;
      },
      [formatPhoneNumber]
   );

   return {
      initiatePayment,
      checkPaymentStatus,
      formatPhoneNumber,
      validatePaymentRequest,
      isInitiating,
      isCheckingStatus,
   };
}

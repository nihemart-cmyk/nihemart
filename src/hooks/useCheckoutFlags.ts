"use client";
import { useMemo } from "react";

type Args = {
   orderItemsCount: number;
   selectedAddress: any | null;
   formData: any;
   selectedProvince: string | null;
   provinces: any[];
   selectedSector: string | null;
   sectors: any[];
   formatPhoneNumber: (s: string) => string;
   paymentMethod: string | "" | undefined;
   paymentVerified: boolean;
   effectiveIsRetry: boolean;
   ordersEnabled: boolean | null;
   ordersSource: "admin" | "schedule" | null;
   scheduleConfirmChecked: boolean;
};

export default function useCheckoutFlags({
   orderItemsCount,
   selectedAddress,
   formData,
   selectedProvince,
   provinces,
   selectedSector,
   sectors,
   formatPhoneNumber,
   paymentMethod,
   paymentVerified,
   effectiveIsRetry,
   ordersEnabled,
   ordersSource,
   scheduleConfirmChecked,
}: Args) {
   return useMemo(() => {
      const hasItems = orderItemsCount > 0;

      const selectedProvinceObj = selectedProvince
         ? provinces.find(
              (p: any) => String(p.prv_id) === String(selectedProvince)
           )
         : null;
      const provinceIsKigali = Boolean(
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
      const isKigali = isKigaliBySavedAddress || provinceIsKigali;

      const hasAddress = isKigali
         ? Boolean(
              selectedAddress &&
                 (selectedAddress.display_name || selectedAddress.city)
           )
         : Boolean(
              (selectedAddress &&
                 (selectedAddress.display_name || selectedAddress.city)) ||
                 (formData.address && formData.address.trim())
           );

      const hasEmail = Boolean(formData.email && String(formData.email).trim());

      const phoneForCheck = (
         selectedAddress?.phone ||
         formData.phone ||
         ""
      ).toString();
      const formattedPhoneForCheck = formatPhoneNumber(phoneForCheck || "");
      const hasValidPhone = /^07\d{8}$/.test(formattedPhoneForCheck);

      const paymentRequiresVerification =
         paymentMethod && paymentMethod !== "cash_on_delivery";

      let missingSteps: string[] = [];
      if (!hasItems) missingSteps.push("checkout.missing.addItems");
      if (!hasAddress) missingSteps.push("checkout.missing.address");
      if (!hasEmail) missingSteps.push("checkout.missing.email");
      if (!hasValidPhone) missingSteps.push("checkout.missing.phone");
      if (!paymentMethod) missingSteps.push("checkout.missing.paymentMethod");
      if (paymentRequiresVerification && !paymentVerified)
         missingSteps.push("checkout.missing.completePayment");

      if (effectiveIsRetry) {
         const retryOnly: string[] = [];
         if (!paymentMethod)
            retryOnly.push("checkout.missing.selectAnotherMethod");
         missingSteps = retryOnly;
      }

      const allStepsCompleted =
         hasItems &&
         hasAddress &&
         hasEmail &&
         hasValidPhone &&
         Boolean(paymentMethod) &&
         (!paymentRequiresVerification ||
            paymentVerified ||
            String(paymentMethod) === "cash_on_delivery");

      return {
         hasItems,
         isKigali,
         hasAddress,
         hasEmail,
         hasValidPhone,
         paymentRequiresVerification,
         missingSteps,
         allStepsCompleted,
         selectedProvinceObj,
      };
   }, [
      orderItemsCount,
      selectedAddress,
      formData,
      selectedProvince,
      provinces,
      selectedSector,
      sectors,
      formatPhoneNumber,
      paymentMethod,
      paymentVerified,
      effectiveIsRetry,
      ordersEnabled,
      ordersSource,
      scheduleConfirmChecked,
   ]);
}

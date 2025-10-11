import { Suspense } from "react";
import CheckoutWrapper from "./CheckoutWrapper";

const CheckoutPageWithSuspense = () => {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <span className="text-sm text-muted-foreground">Loading checkout...</span>
        </div>
      </div>
    }>
      <CheckoutWrapper />
    </Suspense>
  );
};

export default CheckoutPageWithSuspense;
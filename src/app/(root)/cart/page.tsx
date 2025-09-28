"use client";

import { Minus, Plus, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import Link from "next/link";
import { useEffect, useState } from "react";

const Cart = () => {
   const { t } = useLanguage();
   const {
      items,
      updateQuantity,
      removeItem,
      itemsCount,
      total,
      subtotal,
      // transport,
   } = useCart();

   const [isLoading, setIsLoading] = useState(true);
   const [updatingItem, setUpdatingItem] = useState<string | null>(null);
   const [removingItem, setRemovingItem] = useState<string | null>(null);

   // Simulate loading state to prevent flash of empty content
   useEffect(() => {
      const timer = setTimeout(() => {
         setIsLoading(false);
      }, 500); // Short delay to show loading state

      return () => clearTimeout(timer);
   }, []);

   const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
      if (newQuantity < 1) return;
      
      setUpdatingItem(itemId);
      try {
         await updateQuantity(itemId, newQuantity);
      } catch (error) {
         console.error("Failed to update quantity:", error);
      } finally {
         setUpdatingItem(null);
      }
   };

   const handleRemoveItem = async (itemId: string) => {
      setRemovingItem(itemId);
      try {
         await removeItem(itemId);
      } catch (error) {
         console.error("Failed to remove item:", error);
      } finally {
         setRemovingItem(null);
      }
   };

   // Loading state
   if (isLoading) {
      return (
         <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-12 max-w-6xl">
            <div className="text-center py-12 sm:py-16">
               <div className="flex justify-center mb-4">
                  <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 text-orange-500 animate-spin" />
               </div>
               <h2 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900">
                  Loading your cart...
               </h2>
               <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto">
                  Getting your items ready
               </p>
            </div>
         </div>
      );
   }

   // Empty cart state
   if (items.length === 0) {
      return (
         <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-16 max-w-4xl">
            <div className="text-center max-w-md mx-auto">
               <ShoppingBag className="h-16 w-16 sm:h-24 sm:w-24 text-muted-foreground mx-auto mb-4 sm:mb-6" />
               <h2 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900">
                  {t("cart.empty")}
               </h2>
               <p className="text-muted-foreground mb-6 sm:mb-8 text-sm sm:text-base">
                  {t("cart.addProducts")}
               </p>
               <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base">
                  <Link href={"/products"}>{t("cart.continue")}</Link>
               </Button>
            </div>
         </div>
      );
   }

   return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-[90vw]">
         <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-gray-900">
               {t("cart.title")}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
               Review your items and proceed to checkout
            </p>
            <div className="flex items-center mt-2">
               <span className="text-sm text-gray-600 bg-orange-50 px-2 py-1 rounded-full">
                  {itemsCount} item{itemsCount !== 1 ? 's' : ''} in cart
               </span>
            </div>
         </div>

         <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
               {items.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow duration-200">
                     <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                           {/* Image */}
                           <div className="flex-shrink-0">
                              <img
                                 src={item.image}
                                 alt={item.name}
                                 className="w-full h-32 sm:h-24 sm:w-24 object-cover rounded-md"
                                 onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                                 }}
                              />
                           </div>

                           {/* Details */}
                           <div className="flex-1 min-w-0 flex flex-col justify-between">
                              {/* Name & Variant */}
                              <div className="mb-2 sm:mb-3">
                                 <h3 className="font-semibold text-sm sm:text-base text-gray-900 break-words mb-1">
                                    {item.name}
                                 </h3>
                                 {item.variant && (
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                       Variant: {item.variant}
                                    </p>
                                 )}
                              </div>
                              
                              {/* Price */}
                              <p className="font-bold text-orange-500 text-sm sm:text-base mb-3 sm:mb-4">
                                 {item.price.toLocaleString()} RWF
                              </p>
                              
                              {/* Quantity & Remove */}
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center space-x-2">
                                    <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                       disabled={item.quantity <= 1 || updatingItem === item.id}
                                       className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                                       aria-label="Decrease quantity"
                                    >
                                       {updatingItem === item.id ? (
                                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                       ) : (
                                          <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                                       )}
                                    </Button>
                                    <span className="w-8 text-center text-sm sm:text-base font-medium">
                                       {item.quantity}
                                    </span>
                                    <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                       disabled={updatingItem === item.id}
                                       className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                                       aria-label="Increase quantity"
                                    >
                                       {updatingItem === item.id ? (
                                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                       ) : (
                                          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                                       )}
                                    </Button>
                                 </div>
                                 
                                 <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveItem(item.id)}
                                    disabled={removingItem === item.id}
                                    className="text-destructive hover:text-destructive hover:bg-red-50 h-8 w-8 sm:h-9 sm:w-9 p-0"
                                    aria-label="Remove item"
                                 >
                                    {removingItem === item.id ? (
                                       <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                    ) : (
                                       <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                    )}
                                 </Button>
                              </div>
                           </div>
                        </div>
                        
                        {/* Item Total */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                           <div className="flex justify-between items-center">
                              <span className="text-xs sm:text-sm text-gray-600">Item total:</span>
                              <span className="font-semibold text-sm sm:text-base text-gray-900">
                                 {(item.price * item.quantity).toLocaleString()} RWF
                              </span>
                           </div>
                        </div>
                     </CardContent>
                  </Card>
               ))}
            </div>

            {/* Order Summary */}
            <div className="lg:sticky lg:top-4">
               <Card className="border border-gray-200 shadow-sm">
                  <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                     <h3 className="text-lg font-semibold text-gray-900">Order Summary</h3>

                     <div className="space-y-3">
                        <div className="flex justify-between text-sm sm:text-base">
                           <span className="text-gray-600">Subtotal ({itemsCount} items)</span>
                           <span className="font-medium">{subtotal.toLocaleString()} RWF</span>
                        </div>
                        
                        {/* <div className="flex justify-between text-sm sm:text-base">
                           <span className="text-gray-600">Transport fee</span>
                           <span>{transport.toLocaleString()} RWF</span>
                        </div> */}
                        
                        <Separator />
                        
                        <div className="flex justify-between font-bold text-base sm:text-lg">
                           <span className="text-gray-900">{t("cart.total")}</span>
                           <span className="text-orange-600">{total.toLocaleString()} RWF</span>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <Button
                           className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base h-11 sm:h-12"
                           size="lg"
                           asChild
                        >
                           <Link href={"/checkout"}>
                              {t("cart.order")}
                           </Link>
                        </Button>

                        <Button
                           variant="outline"
                           className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 text-sm sm:text-base h-11 sm:h-12"
                           asChild
                        >
                           <Link href={"/products"}>
                              {t("cart.continue")}
                           </Link>
                        </Button>
                     </div>
                     
                  
                  </CardContent>
               </Card>
               
           
            </div>
         </div>
      </div>
   );
};

export default Cart;
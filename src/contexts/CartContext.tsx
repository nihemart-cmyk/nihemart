"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";

export interface CartItem {
   id: string; // Unique ID for the cart item (e.g., product_id-variant_name)
   name: string;
   price: number;
   quantity: number;
   image: string;
   variant?: string;
   product_id: string; // actual product UUID
   product_variation_id?: string | null; // actual variation UUID when present
}

interface CartContextType {
   items: CartItem[];
   addItem: (item: Omit<CartItem, "quantity" | "id"> & { id?: string }) => void;
   updateQuantity: (id: string, quantity: number) => void;
   removeItem: (id: string) => void;
   clearCart: () => void;
   itemsCount: number;
   total: number;
   subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
   const context = useContext(CartContext);
   if (!context) {
      throw new Error("useCart must be used within a CartProvider");
   }
   return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
   children,
}) => {
   const [items, setItems] = useState<CartItem[]>([]);

   useEffect(() => {
      try {
         const savedCart = localStorage.getItem("cart");
         if (savedCart) {
            setItems(JSON.parse(savedCart));
         }
      } catch (e) {
         console.error("Failed to parse cart from localStorage", e);
      }
   }, []);

   useEffect(() => {
      localStorage.setItem("cart", JSON.stringify(items));
   }, [items]);

   const addItem = (
      newItem: Omit<CartItem, "quantity" | "id"> & { id?: string }
   ) => {
      // Ensure product_id is a UUID (or provided) and store product_variation_id separately.
      const cartItemId =
         newItem.id ||
         `${newItem.product_id}${
            newItem.product_variation_id
               ? `-${newItem.product_variation_id}`
               : ""
         }`;

      setItems((prevItems) => {
         const existingItem = prevItems.find((item) => item.id === cartItemId);
         if (existingItem) {
            const updatedItems = prevItems.map((item) =>
               item.id === cartItemId
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
            );
            toast.info(`'${newItem.name}' quantity updated in cart.`);
            return updatedItems;
         } else {
            toast.success(`'${newItem.name}' has been added to your cart.`);
            return [...prevItems, { ...newItem, id: cartItemId, quantity: 1 }];
         }
      });
   };

   const updateQuantity = (id: string, quantity: number) => {
      if (quantity < 1) {
         removeItem(id);
         return;
      }
      setItems((prevItems) =>
         prevItems.map((item) =>
            item.id === id ? { ...item, quantity } : item
         )
      );
   };

   const removeItem = (id: string) => {
      setItems((prevItems) => {
         const itemToRemove = prevItems.find((item) => item.id === id);
         if (itemToRemove) {
            toast.error(
               `'${itemToRemove.name}' has been removed from your cart.`
            );
         }
         return prevItems.filter((item) => item.id !== id);
      });
   };

   const clearCart = () => {
      setItems([]);
      toast.info("Cart Cleared", {
         description: "All items have been removed from your cart.",
      });
   };

   const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
   const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
   );

   return (
      <CartContext.Provider
         value={{
            items,
            addItem,
            updateQuantity,
            removeItem,
            clearCart,
            itemsCount,
            total: subtotal,
            subtotal,
         }}
      >
         {children}
      </CartContext.Provider>
   );
};

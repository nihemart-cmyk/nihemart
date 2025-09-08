"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ProductSelect } from "@/components/orders/ProductSelect";
import { useProducts } from "@/hooks/useProducts";
import { Product } from "@/integrations/supabase/products";
import { useOrders } from "@/hooks/useOrders";
import { useRouter } from "next/navigation";
import { useExternalOrders } from "@/hooks/useExternalOrders";
import { format } from "date-fns";
import { DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserAvatarProfile } from "@/components/user-avatar-profile";

interface ExternalOrderItemInput {
   product_name: string;
   quantity: number;
   price: number;
   variation_name?: string;
}

interface ExternalOrderFormData {
   customer_name: string;
   customer_email?: string;
   customer_phone: string;
   delivery_address: string;
   delivery_city: string;
   delivery_notes?: string;
   status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
   source: "whatsapp" | "phone" | "other";
   total: number;
   items: ExternalOrderItemInput[];
   is_external: boolean;
   is_paid: boolean;
}

export default function AddExternalOrderPage() {
   const router = useRouter();
   const { createExternalOrder } = useExternalOrders();
   const productsHook = useProducts();
   const { data: products, isLoading: productsLoading } =
      productsHook.useProducts();
   const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
   const [isSubmitting, setIsSubmitting] = useState(false);

   const [formData, setFormData] = useState<ExternalOrderFormData>({
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      delivery_address: "",
      delivery_city: "",
      delivery_notes: "",
      status: "pending",
      total: 0,
      source: "whatsapp",
      is_external: true,
      is_paid: true,
      items: [
         {
            product_name: "",
            quantity: 1,
            price: 0,
         },
      ],
   });

   const handleItemChange = (
      index: number,
      field: keyof ExternalOrderItemInput,
      value: string | number
   ) => {
      const newItems = [...formData.items];
      newItems[index] = { ...newItems[index], [field]: value };
      setFormData((prev) => ({
         ...prev,
         items: newItems,
         total: newItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
         ),
      }));
   };

   const addOrderItem = () => {
      setFormData((prev) => ({
         ...prev,
         items: [...prev.items, { product_name: "", quantity: 1, price: 0 }],
      }));
   };

   const removeOrderItem = (index: number) => {
      if (formData.items.length > 1) {
         const newItems = formData.items.filter((_, i) => i !== index);
         setFormData((prev) => ({
            ...prev,
            items: newItems,
            total: newItems.reduce(
               (sum, item) => sum + item.price * item.quantity,
               0
            ),
         }));
      }
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      console.log("External Order - Submit handler called");

      if (isSubmitting) {
         console.log("Already submitting, returning");
         return;
      }
      setIsSubmitting(true);
      console.log("Starting submission...");

      // Merge selectedProducts into items if available
      const normalizedItems = formData.items.map((item, idx) => {
         const sel = selectedProducts[idx];
         if (sel) {
            return {
               ...item,
               product_name: sel.name || item.product_name,
               price: sel.price ?? item.price,
            };
         }
         return item;
      });

      // Update formData.items with normalized items so UI stays in sync
      setFormData((prev) => ({ ...prev, items: normalizedItems }));

      // Include full form validation
      if (
         !formData.customer_name.trim() ||
         !formData.customer_phone.trim() ||
         !formData.delivery_address.trim()
      ) {
         toast.error("Please fill in all required fields");
         setIsSubmitting(false);
         return;
      }

      if (
         formData.items.some(
            (item) => !item.product_name || item.quantity < 1 || item.price <= 0
         )
      ) {
         toast.error("Please fill in all order items correctly");
         setIsSubmitting(false);
         return;
      }

      try {
         // Basic validation
         if (
            !formData.customer_name ||
            !formData.customer_phone ||
            !formData.delivery_address ||
            !formData.delivery_city
         ) {
            toast.error("Please fill in all required fields");
            setIsSubmitting(false);
            return;
         }

         if (
            formData.items.some(
               (item) =>
                  !item.product_name || item.quantity < 1 || item.price <= 0
            )
         ) {
            toast.error("Please fill in all order items correctly");
            setIsSubmitting(false);
            return;
         }

         const calculatedTotal = formData.items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
         );

         console.log("Calculated total:", calculatedTotal);

         const orderData = {
            ...formData,
            total: calculatedTotal,
            items: formData.items.map((item) => ({
               ...item,
               total: item.price * item.quantity,
            })),
            is_external: true,
            is_paid: true,
         };

         console.log("Creating external order with data:", orderData);

         try {
            // Call mutation with updated data
            const result = await createExternalOrder.mutateAsync(orderData);
            console.log("External order created successfully:", result);

            toast.success("External order added successfully");
            router.push("/admin/orders/external");
            return;
         } catch (error) {
            console.error("Failed to create external order:", error);
            toast.error(
               (error as Error).message || "Failed to add external order"
            );
            setIsSubmitting(false); // Reset submit state on error
            return;
         }
      } catch (error: any) {
         toast.error(error.message || "Failed to add external order");
      } finally {
         setIsSubmitting(false);
      }
   };

   return (
      <ScrollArea className="h-[calc(100vh-5rem)] bg-surface-secondary">
         <div className="container max-w-4xl mx-auto py-10">
            <form onSubmit={handleSubmit}>
               <Card>
                  <CardHeader>
                     <CardTitle>Add External Order</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                     {/* Customer Information */}
                     <div className="space-y-4">
                        <h3 className="font-semibold">Customer Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                              <Label htmlFor="customerName">
                                 Customer Name *
                              </Label>
                              <Input
                                 id="customerName"
                                 value={formData.customer_name}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       customer_name: e.target.value,
                                    })
                                 }
                                 required
                              />
                           </div>
                           <div>
                              <Label htmlFor="phone">Phone *</Label>
                              <Input
                                 id="phone"
                                 value={formData.customer_phone}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       customer_phone: e.target.value,
                                    })
                                 }
                                 required
                              />
                           </div>
                           <div>
                              <Label htmlFor="email">Email</Label>
                              <Input
                                 id="email"
                                 type="email"
                                 value={formData.customer_email}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       customer_email: e.target.value,
                                    })
                                 }
                              />
                           </div>
                           <div>
                              <Label htmlFor="source">Order Source *</Label>
                              <select
                                 id="source"
                                 className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                 value={formData.source}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       source: e.target.value as
                                          | "whatsapp"
                                          | "phone"
                                          | "other",
                                    })
                                 }
                                 required
                              >
                                 <option value="whatsapp">WhatsApp</option>
                                 <option value="phone">Phone Call</option>
                                 <option value="other">Other</option>
                              </select>
                           </div>
                        </div>
                     </div>

                     {/* Delivery Information */}
                     <div className="space-y-4">
                        <h3 className="font-semibold">Delivery Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="md:col-span-2">
                              <Label htmlFor="address">
                                 Delivery Address *
                              </Label>
                              <Input
                                 id="address"
                                 value={formData.delivery_address}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       delivery_address: e.target.value,
                                    })
                                 }
                                 required
                              />
                           </div>
                           <div>
                              <Label htmlFor="city">City *</Label>
                              <Input
                                 id="city"
                                 value={formData.delivery_city}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       delivery_city: e.target.value,
                                    })
                                 }
                                 required
                              />
                           </div>
                           <div>
                              <Label htmlFor="status">Order Status</Label>
                              <select
                                 id="status"
                                 className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                 value={formData.status}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       status: e.target.value as
                                          | "pending"
                                          | "processing"
                                          | "delivered"
                                          | "cancelled",
                                    })
                                 }
                                 required
                              >
                                 <option value="pending">Pending</option>
                                 <option value="processing">Processing</option>
                                 <option value="delivered">Delivered</option>
                                 <option value="cancelled">Cancelled</option>
                              </select>
                           </div>
                           <div className="md:col-span-2">
                              <Label htmlFor="notes">Delivery Notes</Label>
                              <Textarea
                                 id="notes"
                                 value={formData.delivery_notes}
                                 onChange={(e) =>
                                    setFormData({
                                       ...formData,
                                       delivery_notes: e.target.value,
                                    })
                                 }
                                 placeholder="Any special instructions for delivery"
                              />
                           </div>
                        </div>
                     </div>

                     {/* Order Items */}
                     <div className="space-y-4">
                        <div className="flex justify-between items-center">
                           <h3 className="font-semibold">Order Items</h3>
                           <Button
                              type="button"
                              variant="outline"
                              onClick={addOrderItem}
                           >
                              Add Item
                           </Button>
                        </div>
                        <div className="space-y-4">
                           {formData.items.map((item, index) => (
                              <div
                                 key={index}
                                 className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border-b pb-4"
                              >
                                 <div className="md:col-span-2">
                                    <Label>Product *</Label>
                                    <ProductSelect
                                       products={products?.data || []}
                                       selectedProduct={selectedProducts[index]}
                                       onSelect={(product) => {
                                          setSelectedProducts((prev) => {
                                             const next = [...prev];
                                             next[index] = product;
                                             return next;
                                          });
                                          handleItemChange(
                                             index,
                                             "product_name",
                                             product.name
                                          );
                                          handleItemChange(
                                             index,
                                             "price",
                                             product.price
                                          );
                                       }}
                                    />
                                 </div>
                                 <div>
                                    <Label>Price (RWF) *</Label>
                                    <Input
                                       type="number"
                                       min="0"
                                       value={item.price.toString()}
                                       onChange={(e) =>
                                          handleItemChange(
                                             index,
                                             "price",
                                             e.target.value
                                                ? parseFloat(e.target.value)
                                                : 0
                                          )
                                       }
                                       required
                                    />
                                 </div>
                                 <div className="flex gap-2">
                                    <div className="flex-1">
                                       <Label>Quantity *</Label>
                                       <Input
                                          type="number"
                                          min="1"
                                          value={item.quantity.toString()}
                                          onChange={(e) =>
                                             handleItemChange(
                                                index,
                                                "quantity",
                                                e.target.value
                                                   ? parseInt(e.target.value)
                                                   : 1
                                             )
                                          }
                                          required
                                       />
                                    </div>
                                    {formData.items.length > 1 && (
                                       <Button
                                          type="button"
                                          variant="destructive"
                                          className="mb-0.5"
                                          onClick={() => removeOrderItem(index)}
                                       >
                                          Remove
                                       </Button>
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* Order Summary */}
                     <div className="space-y-4">
                        <h3 className="font-semibold">Order Summary</h3>
                        <div className="space-y-2">
                           <div className="flex justify-between">
                              <span>Total</span>
                              <span>{formData.total.toLocaleString()} RWF</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex justify-end space-x-4">
                        <Button
                           type="button"
                           variant="outline"
                           onClick={() => router.push("/admin/orders/external")}
                        >
                           Cancel
                        </Button>
                        <Button
                           type="submit"
                           disabled={isSubmitting}
                        >
                           {isSubmitting
                              ? "Adding Order..."
                              : "Add External Order"}
                        </Button>
                     </div>
                  </CardContent>
               </Card>
            </form>
         </div>
      </ScrollArea>
   );
}

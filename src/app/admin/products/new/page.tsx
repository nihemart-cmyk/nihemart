"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuill } from "react-quilljs";
import "quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
   Form,
   FormControl,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
} from "@/components/ui/form";
import { Calendar, Upload, Plus, Info, X } from "lucide-react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";

// Define the schema as a plain object type first
const ProductSchema = z.object({
   name: z
      .string()
      .min(1, "Product name is required")
      .min(3, "Product name must be at least 3 characters"),
   description: z.string().optional(),
   category: z.string().min(1, "Category is required"),
   subCategory: z.string().min(1, "Sub category is required"),
   basePrice: z
      .string()
      .min(1, "Base price is required")
      .regex(/^\d+$/, "Price must be a valid number"),
   discountPrice: z.string().optional(),
   weight: z
      .string()
      .min(1, "Weight is required")
      .regex(/^\d+(\.\d+)?$/, "Weight must be a valid number"),
   weightUnit: z.string().default("kg"),
   size: z.string().optional(),
   color: z.string().optional(),
   stockNumber: z.string().min(1, "Stock number is required"),
   shippingType: z.literal("seller").or(z.literal("platform")),
});

// Explicit type definition to avoid inference issues
interface ProductFormData {
   name: string;
   description?: string;
   category: string;
   subCategory: string;
   basePrice: string;
   discountPrice?: string;
   weight: string;
   weightUnit: string;
   size?: string;
   color?: string;
   stockNumber: string;
   shippingType: "seller" | "platform";
}

interface ProductImage {
   url: string;
   file: File;
}

export default function AddProductForm() {
   const [images, setImages] = useState<ProductImage[]>([]);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const { quill, quillRef } = useQuill({
      theme: "snow",
      modules: {
         toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "image"],
            ["clean"],
         ],
      },
      formats: [
         "header",
         "bold",
         "italic",
         "underline",
         "strike",
         "list",
         "bullet",
         "link",
         "image",
      ],
      placeholder:
         "Describe your product features, specifications, and benefits...",
   });

   // Use explicit type instead of inferred type
   const form = useForm<ProductFormData>({
      resolver: zodResolver(ProductSchema) as any,
      defaultValues: {
         name: "",
         description: "",
         category: "",
         subCategory: "",
         basePrice: "",
         discountPrice: "",
         weight: "",
         weightUnit: "kg",
         size: "",
         color: "",
         stockNumber: "",
         shippingType: "seller",
      },
   });

   // Sync Quill content with react-hook-form
   useEffect(() => {
      if (quill) {
         quill.on("text-change", () => {
            form.setValue("description", quill.root.innerHTML, {
               shouldValidate: true,
            });
         });
      }
   }, [quill, form]);

   // Custom image handler for Quill
   const insertToEditor = (url: string) => {
      if (quill) {
         const range = quill.getSelection(true);
         quill.insertEmbed(range.index, "image", url);
         quill.setSelection(range.index + 1, 0);
      }
   };

   const selectLocalImage = () => {
      const input = document.createElement("input");
      input.setAttribute("type", "file");
      input.setAttribute("accept", "image/*");
      input.click();

      input.onchange = () => {
         const file = input.files?.[0];
         if (file) {
            const url = URL.createObjectURL(file);
            insertToEditor(url);
         }
      };
   };

   useEffect(() => {
      if (quill) {
         const toolbar = quill.getModule("toolbar") as {
            addHandler: (type: string, handler: () => void) => void;
         };
         toolbar.addHandler("image", selectLocalImage);
      }
   }, [quill]);

   const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const fullData = { ...data, images: images.map((img) => img.url) };
      console.log("Form Submitted Data:", fullData);
   };

   const onDrop = useCallback((acceptedFiles: File[]) => {
      const newImages: ProductImage[] = acceptedFiles.map((file) => ({
         url: URL.createObjectURL(file),
         file,
      }));
      setImages((prev) => [...prev, ...newImages]);
   }, []);

   const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: { "image/*": [] },
      multiple: true,
   });

   const removeImage = (index: number) => {
      setImages((prev) => {
         const newImages = prev.filter((_, i) => i !== index);
         URL.revokeObjectURL(prev[index].url);
         return newImages;
      });
   };

   // Cleanup object URLs on component unmount
   useEffect(() => {
      return () => {
         images.forEach((img) => URL.revokeObjectURL(img.url));
      };
   }, [images]);

   return (
      <div className="min-h-screen ">
         <ScrollArea className="h-screen pb-8">
            <div className="p-6 pb-20">
               <div className="mx-auto">
                  {/* Header */}
                  <div className="flex justify-between md:items-center mb-6 flex-col gap-4 md:flex-row">
                     <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                           Add a New Product
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                           Orders placed across your store.
                        </p>
                     </div>
                     <div className="flex gap-3">
                        <Button
                           variant="outline"
                           className="text-gray-600"
                        >
                           Discard
                        </Button>
                        <Button
                           variant="outline"
                           className="text-gray-600"
                        >
                           Save Draft
                        </Button>
                        <Button
                           onClick={form.handleSubmit(onSubmit)}
                           className="bg-green-600 hover:bg-green-700 text-white"
                           disabled={form.formState.isSubmitting}
                        >
                           <Plus className="w-4 h-4 mr-2" />
                           {form.formState.isSubmitting
                              ? "Adding Product..."
                              : "Add Product"}
                        </Button>
                     </div>
                  </div>

                  <Form {...form}>
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column */}
                        <div className="lg:col-span-2 space-y-6">
                           {/* Product Description */}
                           <div>
                              <h3 className="text-lg font-medium mb-4 flex items-center ">
                                 Product Description
                              </h3>
                              <Card>
                                 <CardContent className="p-6">
                                    <div className="space-y-4">
                                       <FormField
                                          control={form.control}
                                          name="name"
                                          render={({ field }) => (
                                             <FormItem>
                                                <FormLabel className="text-zinc-500">
                                                   Product Name
                                                </FormLabel>
                                                <FormControl>
                                                   <Input
                                                      placeholder="Enter product name (e.g., Apple MacBook Pro M3)"
                                                      {...field}
                                                      className="border-gray-400 placeholder:text-gray-400"
                                                   />
                                                </FormControl>
                                                <FormMessage />
                                             </FormItem>
                                          )}
                                       />

                                       <FormField
                                          control={form.control}
                                          name="description"
                                          render={({ field }) => (
                                             <FormItem>
                                                <FormLabel className="text-zinc-500">
                                                   Description (Optional)
                                                </FormLabel>
                                                <FormControl>
                                                   <div className="border border-gray-400 rounded-md">
                                                      <div
                                                         ref={quillRef}
                                                         className="min-h-[120px] bg-white"
                                                      />
                                                   </div>
                                                </FormControl>
                                                <FormMessage />
                                             </FormItem>
                                          )}
                                       />
                                    </div>
                                 </CardContent>
                              </Card>
                           </div>

                           {/* Category */}
                           <div>
                              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                 Category
                              </h3>
                              <Card>
                                 <CardContent className="p-6">
                                    <div className="space-y-4">
                                       <FormField
                                          control={form.control}
                                          name="category"
                                          render={({ field }) => (
                                             <FormItem>
                                                <FormLabel className="text-zinc-500">
                                                   Product Category
                                                </FormLabel>
                                                <Select
                                                   onValueChange={
                                                      field.onChange
                                                   }
                                                   defaultValue={field.value}
                                                >
                                                   <FormControl>
                                                      <SelectTrigger className="border-gray-400">
                                                         <SelectValue placeholder="Select a category" />
                                                      </SelectTrigger>
                                                   </FormControl>
                                                   <SelectContent>
                                                      <SelectItem value="electronics">
                                                         Electronics
                                                      </SelectItem>
                                                      <SelectItem value="clothing">
                                                         Clothing & Fashion
                                                      </SelectItem>
                                                      <SelectItem value="books">
                                                         Books & Media
                                                      </SelectItem>
                                                      <SelectItem value="home">
                                                         Home & Garden
                                                      </SelectItem>
                                                      <SelectItem value="sports">
                                                         Sports & Outdoors
                                                      </SelectItem>
                                                   </SelectContent>
                                                </Select>
                                                <FormMessage />
                                             </FormItem>
                                          )}
                                       />

                                       <FormField
                                          control={form.control}
                                          name="subCategory"
                                          render={({ field }) => (
                                             <FormItem>
                                                <FormLabel className="text-zinc-500">
                                                   Sub Category
                                                </FormLabel>
                                                <Select
                                                   onValueChange={
                                                      field.onChange
                                                   }
                                                   defaultValue={field.value}
                                                >
                                                   <FormControl>
                                                      <SelectTrigger className="border-gray-400">
                                                         <SelectValue placeholder="Select a sub-category" />
                                                      </SelectTrigger>
                                                   </FormControl>
                                                   <SelectContent>
                                                      <SelectItem value="laptops">
                                                         Laptops
                                                      </SelectItem>
                                                      <SelectItem value="smartphones">
                                                         Smartphones
                                                      </SelectItem>
                                                      <SelectItem value="tablets">
                                                         Tablets
                                                      </SelectItem>
                                                      <SelectItem value="accessories">
                                                         Accessories
                                                      </SelectItem>
                                                   </SelectContent>
                                                </Select>
                                                <FormMessage />
                                             </FormItem>
                                          )}
                                       />
                                    </div>
                                 </CardContent>
                              </Card>
                           </div>

                           {/* Variant */}
                           <div>
                              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                 Variant
                              </h3>
                              <Card>
                                 <CardContent className="p-6">
                                    <div className="space-y-4">
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <FormField
                                             control={form.control}
                                             name="size"
                                             render={({ field }) => (
                                                <FormItem>
                                                   <FormLabel className="text-zinc-500">
                                                      Size Options
                                                   </FormLabel>
                                                   <FormControl>
                                                      <Input
                                                         placeholder="e.g., 512GB, 1TB, 2TB"
                                                         {...field}
                                                         className="border-gray-400 placeholder:text-gray-400"
                                                      />
                                                   </FormControl>
                                                   <FormMessage />
                                                </FormItem>
                                             )}
                                          />

                                          <FormField
                                             control={form.control}
                                             name="color"
                                             render={({ field }) => (
                                                <FormItem>
                                                   <FormLabel className="text-zinc-500">
                                                      Color Options
                                                   </FormLabel>
                                                   <FormControl>
                                                      <Input
                                                         placeholder="e.g., Silver, Space Gray, Gold"
                                                         {...field}
                                                         className="border-gray-400 placeholder:text-gray-400"
                                                      />
                                                   </FormControl>
                                                   <FormMessage />
                                                </FormItem>
                                             )}
                                          />
                                       </div>

                                       <FormField
                                          control={form.control}
                                          name="stockNumber"
                                          render={({ field }) => (
                                             <FormItem>
                                                <FormLabel className="text-zinc-500">
                                                   Stock Number
                                                </FormLabel>
                                                <FormControl>
                                                   <Input
                                                      placeholder="Enter unique stock number (e.g., MB-2023-001)"
                                                      {...field}
                                                      className="border-gray-400 placeholder:text-gray-400"
                                                   />
                                                </FormControl>
                                                <FormMessage />
                                             </FormItem>
                                          )}
                                       />
                                    </div>
                                 </CardContent>
                              </Card>
                           </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                           {/* Product Image */}
                           <div>
                              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                 Product Images
                                 <Info className="w-4 h-4 text-gray-400" />
                              </h3>
                              <Card>
                                 <CardContent className="p-6">
                                    <div className="space-y-2">
                                       {/* Dropzone */}
                                       <div
                                          {...getRootProps()}
                                          className="flex h-40 w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                                       >
                                          <input {...getInputProps()} />
                                          <div className="flex flex-col items-center justify-center space-y-2 text-center text-sm text-gray-500">
                                             <Upload className="h-8 w-8" />
                                             <div>
                                                {isDragActive ? (
                                                   <p>
                                                      Drop the images here ...
                                                   </p>
                                                ) : (
                                                   <>
                                                      <p>
                                                         Drag & drop your images
                                                         here, or
                                                      </p>
                                                      <p className="text-blue-600">
                                                         Click to upload
                                                      </p>
                                                   </>
                                                )}
                                             </div>
                                          </div>
                                       </div>
                                       {/* Image Previews */}
                                       {images.length > 0 && (
                                          <div className="flex flex-wrap gap-2 mt-4">
                                             {images.map(({ url }, index) => (
                                                <div
                                                   key={index}
                                                   className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border group"
                                                >
                                                   <Image
                                                      src={url}
                                                      alt={`Product ${
                                                         index + 1
                                                      }`}
                                                      fill
                                                      className="object-cover"
                                                   />
                                                   <button
                                                      type="button"
                                                      onClick={() =>
                                                         removeImage(index)
                                                      }
                                                      className="absolute top-2 right-2 h-6 w-6 bg-red-500 hover:bg-red-600 text-white rounded-full p-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                   >
                                                      <X className="h-3 w-3" />
                                                   </button>
                                                </div>
                                             ))}
                                          </div>
                                       )}
                                    </div>
                                 </CardContent>
                              </Card>
                           </div>

                           {/* Pricing */}
                           <div>
                              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                 Pricing
                              </h3>
                              <Card>
                                 <CardContent className="p-6">
                                    <div className="space-y-4">
                                       <FormField
                                          control={form.control}
                                          name="basePrice"
                                          render={({ field }) => (
                                             <FormItem>
                                                <FormLabel className="text-zinc-500">
                                                   Base Price
                                                </FormLabel>
                                                <FormControl>
                                                   <Input
                                                      placeholder="Enter price (e.g., 680000)"
                                                      {...field}
                                                      className="border-gray-400 placeholder:text-gray-400"
                                                   />
                                                </FormControl>
                                                <FormMessage />
                                             </FormItem>
                                          )}
                                       />

                                       <div className="grid grid-cols-2 gap-4">
                                          <FormField
                                             control={form.control}
                                             name="discountPrice"
                                             render={({ field }) => (
                                                <FormItem>
                                                   <FormLabel className="text-zinc-500">
                                                      Discount Price
                                                   </FormLabel>
                                                   <FormControl>
                                                      <Input
                                                         placeholder="550000"
                                                         {...field}
                                                         className="border-gray-400 placeholder:text-gray-400"
                                                      />
                                                   </FormControl>
                                                   <FormMessage />
                                                </FormItem>
                                             )}
                                          />
                                          <div>
                                             <Label className="text-sm font-medium text-zinc-500">
                                                Start Date / End Date
                                             </Label>
                                             <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full mt-1 justify-start border-gray-400"
                                             >
                                                <Calendar className="w-4 h-4 mr-2" />
                                                <span className="text-gray-400">
                                                   Select dates
                                                </span>
                                             </Button>
                                          </div>
                                       </div>
                                    </div>
                                 </CardContent>
                              </Card>
                           </div>

                           {/* Delivery */}
                           <div>
                              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                 Delivery
                              </h3>
                              <Card>
                                 <CardContent className="p-6">
                                    <div className="space-y-4">
                                       <div className="grid grid-cols-2 gap-4">
                                          <FormField
                                             control={form.control}
                                             name="weight"
                                             render={({ field }) => (
                                                <FormItem>
                                                   <FormLabel className="text-zinc-500">
                                                      Item Weight
                                                   </FormLabel>
                                                   <FormControl>
                                                      <Input
                                                         placeholder="Enter weight (e.g., 2.1)"
                                                         {...field}
                                                         className="border-gray-400 placeholder:text-gray-400"
                                                      />
                                                   </FormControl>
                                                   <FormMessage />
                                                </FormItem>
                                             )}
                                          />
                                          <FormField
                                             control={form.control}
                                             name="weightUnit"
                                             render={({ field }) => (
                                                <FormItem>
                                                   <FormLabel className="text-zinc-500">
                                                      Unit
                                                   </FormLabel>
                                                   <Select
                                                      onValueChange={
                                                         field.onChange
                                                      }
                                                      defaultValue={field.value}
                                                   >
                                                      <FormControl>
                                                         <SelectTrigger className="border-gray-400">
                                                            <SelectValue />
                                                         </SelectTrigger>
                                                      </FormControl>
                                                      <SelectContent>
                                                         <SelectItem value="kg">
                                                            kg
                                                         </SelectItem>
                                                         <SelectItem value="lb">
                                                            lb
                                                         </SelectItem>
                                                         <SelectItem value="g">
                                                            g
                                                         </SelectItem>
                                                      </SelectContent>
                                                   </Select>
                                                   <FormMessage />
                                                </FormItem>
                                             )}
                                          />
                                       </div>

                                       <p className="text-xs text-gray-500">
                                          *Package size (The package you use to
                                          ship your product)
                                       </p>

                                       <FormField
                                          control={form.control}
                                          name="shippingType"
                                          render={({ field }) => (
                                             <FormItem>
                                                <FormLabel className="text-zinc-500 mb-3 block">
                                                   Shipping Type
                                                </FormLabel>
                                                <FormControl>
                                                   <RadioGroup
                                                      onValueChange={
                                                         field.onChange
                                                      }
                                                      defaultValue={field.value}
                                                      className="space-y-3"
                                                   >
                                                      <div className="flex items-start space-x-3">
                                                         <RadioGroupItem
                                                            value="seller"
                                                            id="seller"
                                                            className="mt-1"
                                                         />
                                                         <div className="flex-1">
                                                            <Label
                                                               htmlFor="seller"
                                                               className="text-sm font-medium"
                                                            >
                                                               Fulfilled by
                                                               Seller
                                                            </Label>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                               You&apos;ll be
                                                               responsible for
                                                               product delivery.
                                                               Any damage or
                                                               delay during
                                                               shipping may cost
                                                               you a Damage fee.
                                                            </p>
                                                         </div>
                                                      </div>
                                                      <div className="flex items-start space-x-3">
                                                         <RadioGroupItem
                                                            value="platform"
                                                            id="platform"
                                                            className="mt-1"
                                                         />
                                                         <div className="flex-1">
                                                            <Label
                                                               htmlFor="platform"
                                                               className="text-sm font-medium"
                                                            >
                                                               Fulfilled by
                                                               Platform
                                                            </Label>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                               We&apos;ll handle the
                                                               shipping and
                                                               delivery process.
                                                               Higher fees but
                                                               better customer
                                                               support.
                                                            </p>
                                                         </div>
                                                      </div>
                                                   </RadioGroup>
                                                </FormControl>
                                                <FormMessage />
                                             </FormItem>
                                          )}
                                       />
                                    </div>
                                 </CardContent>
                              </Card>
                           </div>
                        </div>
                     </div>
                  </Form>
               </div>
            </div>
         </ScrollArea>
      </div>
   );
}

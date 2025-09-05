"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import "quill/dist/quill.snow.css";
import { useCallback, useEffect, useState } from "react";
import { SubmitHandler, useForm, useWatch } from "react-hook-form";
import { useQuill } from "react-quilljs";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, X } from "lucide-react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";

import { supabase } from "@/integrations/supabase/client";
import type { CategoryWithSubcategories, ProductBase, ProductVariation, Subcategory } from "@/integrations/supabase/products";
import { createProduct, fetchCategoriesWithSubcategories } from "@/integrations/supabase/products";

// Corrected Zod Schema to handle optional numeric fields that can be empty strings
const ProductSchema = z.object({
  name: z.string().min(3, "Product name must be at least 3 characters"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  subCategory: z.string().min(1, "Sub category is required"),
  basePrice: z.string()
    .min(1, "Base price is required")
    .regex(/^\d+(\.\d+)?$/, "Price must be a valid number"),
  discountPrice: z.string().optional().refine(val => !val || /^\d+(\.\d+)?$/.test(val), {
    message: "Discount price must be a valid number",
  }),
  weight: z.string()
    .min(1, "Weight is required")
    .regex(/^\d+(\.\d+)?$/, "Weight must be a valid number"),
  weightUnit: z.string().default("kg"),
  size: z.string().optional(),
  color: z.string().optional(),
  stock: z.string()
    .min(1, "Stock is required")
    .regex(/^\d+$/, "Stock must be a whole number"),
  sku: z.string().optional(),
  shippingType: z.enum(["seller", "platform"]),
});


type ProductFormData = z.infer<typeof ProductSchema>;

interface ProductImageFile {
   url: string;
   file: File;
}

// Helper to define Quill's toolbar type
interface QuillToolbar {
  addHandler: (name: string, handler: () => void) => void;
}

const uploadFileToBucket = async (file: File, bucket: string): Promise<string> => {
   const fileExt = file.name.split(".").pop();
   const fileName = `${Date.now()}.${fileExt}`;
   
   const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
   
   if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
   }
   
   const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
   return data.publicUrl;
};

export default function AddProductForm() {
   const router = useRouter();
   const [images, setImages] = useState<ProductImageFile[]>([]);
   const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
   const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
   const { quill, quillRef } = useQuill({ theme: "snow" });
   
   const form = useForm<ProductFormData>({
      // @ts-ignore
      resolver: zodResolver(ProductSchema),
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
         stock: "",
         sku: "",
         shippingType: "seller",
      },
   });
   
   const selectedCategoryId = useWatch({
      control: form.control,
      name: 'category',
   });
   
   useEffect(() => {
      const loadCategories = async () => {
         try {
            const fetchedCategories = await fetchCategoriesWithSubcategories();
            setCategories(fetchedCategories);
         } catch (error) {
            console.error("Failed to fetch categories:", error);
         }
      };
      loadCategories();
   }, []);

   useEffect(() => {
      if (selectedCategoryId) {
         const selectedCategory = categories.find(c => c.id === selectedCategoryId);
         setSubcategories(selectedCategory?.subcategories || []);
         form.setValue('subCategory', '');
      } else {
         setSubcategories([]);
      }
   }, [selectedCategoryId, categories, form]);

   useEffect(() => {
      if (quill) {
         quill.on("text-change", () => {
            form.setValue("description", quill.root.innerHTML, { shouldValidate: true });
         });

         const toolbar = quill.getModule("toolbar") as QuillToolbar | null;
         if (toolbar) {
            toolbar.addHandler("image", () => {
               const input = document.createElement("input");
               input.setAttribute("type", "file");
               input.setAttribute("accept", "image/*");
               input.click();

               input.onchange = async () => {
                  const file = input.files?.[0];
                  if (file) {
                     try {
                        const url = await uploadFileToBucket(file, "product-content-images");
                        const range = quill.getSelection(true);
                        quill.insertEmbed(range.index, "image", url);
                        quill.setSelection(range.index + 1, 0);
                     } catch (error) {
                        console.error("Quill image upload failed:", error);
                     }
                  }
               };
            });
         }
      }
   }, [quill, form]);
   
   const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
      try {
         const imageUrls = await Promise.all(
            images.map(image => uploadFileToBucket(image.file, 'product-images'))
         );

         const productData: ProductBase = {
            name: data.name,
            description: data.description,
            price: parseFloat(data.basePrice),
            compare_at_price: data.discountPrice ? parseFloat(data.discountPrice) : null,
            category_id: data.category,
            subcategory_id: data.subCategory,
            weight_kg: parseFloat(data.weight),
            sku: data.sku || null,
            requires_shipping: true,
            status: 'draft',
            main_image_url: imageUrls[0] || null,
         };

         const variations: ProductVariation[] = [];
         if (data.color || data.size) {
            variations.push({
               name: `${data.color || ''} ${data.size || ''}`.trim(),
               price: parseFloat(data.basePrice),
               stock: parseInt(data.stock, 10),
               attributes: {
                  ...(data.color && { color: data.color }),
                  ...(data.size && { size: data.size }),
               }
            });
         } else {
            productData.stock = parseInt(data.stock, 10);
         }
         
         await createProduct(productData, variations, imageUrls);
         router.push('/admin/products');
      } catch (error) {
         console.error("Failed to create product:", error);
      }
   };
   
   const onDrop = useCallback((acceptedFiles: File[]) => {
      const newImages: ProductImageFile[] = acceptedFiles.map((file) => ({
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
   
   useEffect(() => {
      return () => {
         images.forEach((img) => URL.revokeObjectURL(img.url));
      };
   }, [images]);

   return (
      <div className="min-h-screen">
         <ScrollArea className="h-screen pb-8">
            <div className="p-6 pb-20">
               <div className="mx-auto">
                  <div className="flex justify-between md:items-center mb-6 flex-col gap-4 md:flex-row">
                     <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Add a New Product</h1>
                        <p className="text-sm text-gray-600 mt-1">Fill in the details to add a new product to your store.</p>
                     </div>
                     <div className="flex gap-3">
                        <Button variant="outline" className="text-gray-600" onClick={() => router.back()}>Discard</Button>
                        <Button
                        // @ts-ignore
                           onClick={form.handleSubmit(onSubmit)}
                           className="bg-green-600 hover:bg-green-700 text-white"
                           disabled={form.formState.isSubmitting}
                        >
                           <Plus className="w-4 h-4 mr-2" />
                           {form.formState.isSubmitting ? "Adding Product..." : "Add Product"}
                        </Button>
                     </div>
                  </div>
                  <Form {...form}>
                     {/* @ts-ignore */}
                     <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                           <Card>
                              <CardContent className="p-6 space-y-4">
                                 {/* @ts-ignore */}
                                 <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                       <FormLabel>Product Name</FormLabel>
                                       <FormControl><Input placeholder="e.g., Classic Wooden Chair" {...field} /></FormControl>
                                       <FormMessage />
                                    </FormItem>
                                 )} />
                                 {/* @ts-ignore */}
                                 <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem>
                                       <FormLabel>Description</FormLabel>
                                       <FormControl><div className="border rounded-md"><div ref={quillRef} className="min-h-[120px] bg-white" /></div></FormControl>
                                       <FormMessage />
                                    </FormItem>
                                 )} />
                              </CardContent>
                           </Card>
                           <Card>
                              <CardContent className="p-6 space-y-4">
                                 {/* @ts-ignore */}
                                 <FormField control={form.control} name="category" render={({ field }) => (
                                    <FormItem>
                                       <FormLabel>Product Category</FormLabel>
                                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                                          <SelectContent>
                                             {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                          </SelectContent>
                                       </Select>
                                       <FormMessage />
                                    </FormItem>
                                 )} />
                                 {/* @ts-ignore */}
                                 <FormField control={form.control} name="subCategory" render={({ field }) => (
                                    <FormItem>
                                       <FormLabel>Sub Category</FormLabel>
                                       <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategoryId || subcategories.length === 0}>
                                          <FormControl><SelectTrigger><SelectValue placeholder="Select a sub-category" /></SelectTrigger></FormControl>
                                          <SelectContent>
                                             {subcategories.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}
                                          </SelectContent>
                                       </Select>
                                       <FormMessage />
                                    </FormItem>
                                 )} />
                              </CardContent>
                           </Card>
                           <Card>
                             <CardContent className="p-6 space-y-4">
                                <p className="text-lg font-medium">Variants & Stock</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* @ts-ignore */}
                                  <FormField control={form.control} name="size" render={({ field }) => (
                                    <FormItem>
                                       <FormLabel>Size (Optional)</FormLabel>
                                       <FormControl><Input placeholder="e.g., Large, 42, 1TB" {...field} /></FormControl>
                                       <FormMessage />
                                    </FormItem>
                                  )}/>
                                  {/* @ts-ignore */}
                                  <FormField control={form.control} name="color" render={({ field }) => (
                                    <FormItem>
                                       <FormLabel>Color (Optional)</FormLabel>
                                       <FormControl><Input placeholder="e.g., Space Gray, Gold" {...field} /></FormControl>
                                       <FormMessage />
                                    </FormItem>
                                  )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   {/* @ts-ignore */}
                                   <FormField control={form.control} name="stock" render={({ field }) => (
                                      <FormItem>
                                         <FormLabel>Stock Quantity</FormLabel>
                                         <FormControl><Input type="number" placeholder="e.g., 100" {...field} /></FormControl>
                                         <FormMessage />
                                      </FormItem>
                                   )}/>
                                   {/* @ts-ignore */}
                                   <FormField control={form.control} name="sku" render={({ field }) => (
                                    <FormItem>
                                       <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                                       <FormControl><Input placeholder="e.g., CH-WDN-LG-BLK" {...field} /></FormControl>
                                       <FormMessage />
                                    </FormItem>
                                  )}/>
                                </div>
                             </CardContent>
                           </Card>
                        </div>
                        <div className="space-y-6">
                           <Card>
                             <CardContent className="p-6 space-y-2">
                                <h3 className="text-lg font-medium mb-2">Product Images</h3>
                                <div {...getRootProps()} className="flex h-40 w-full items-center justify-center rounded-md border-2 border-dashed bg-gray-50 cursor-pointer">
                                   <input {...getInputProps()} />
                                   <div className="text-center text-sm text-gray-500">
                                       <Upload className="h-8 w-8 mx-auto" />
                                       <p>{isDragActive ? "Drop the images here..." : "Drag & drop or click to upload"}</p>
                                   </div>
                                </div>
                                {images.length > 0 && (
                                   <div className="flex flex-wrap gap-2 mt-4">
                                      {images.map(({ url }, index) => (
                                         <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden border group">
                                            <Image src={url} alt={`Preview ${index + 1}`} fill className="object-cover" />
                                            <button type="button" onClick={() => removeImage(index)} className="absolute top-1 right-1 h-5 w-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                                               <X className="h-3 w-3" />
                                            </button>
                                         </div>
                                      ))}
                                   </div>
                                )}
                             </CardContent>
                           </Card>
                           <Card>
                              <CardContent className="p-6 space-y-4">
                                <h3 className="text-lg font-medium mb-2">Pricing</h3>
                                 {/* @ts-ignore */}
                                 <FormField control={form.control} name="basePrice" render={({ field }) => (
                                    <FormItem>
                                       <FormLabel>Base Price</FormLabel>
                                       <FormControl><Input placeholder="e.g., 150.00" {...field} /></FormControl>
                                       <FormMessage />
                                    </FormItem>
                                 )} />
                                 {/* @ts-ignore */}
                                 <FormField control={form.control} name="discountPrice" render={({ field }) => (
                                    <FormItem>
                                       <FormLabel>Discount Price (Optional)</FormLabel>
                                       <FormControl><Input placeholder="125.00" {...field} /></FormControl>
                                       <FormMessage />
                                    </FormItem>
                                 )} />
                              </CardContent>
                           </Card>
                           <Card>
                             <CardContent className="p-6 space-y-4">
                               <h3 className="text-lg font-medium mb-2">Delivery</h3>
                                <div className="grid grid-cols-2 gap-4">
                                  {/* @ts-ignore */}
                                  <FormField control={form.control} name="weight" render={({ field }) => (
                                     <FormItem>
                                        <FormLabel>Item Weight</FormLabel>
                                        <FormControl><Input placeholder="e.g., 2.1" {...field} /></FormControl>
                                        <FormMessage />
                                     </FormItem>
                                  )} />
                                  {/* @ts-ignore */}
                                  <FormField control={form.control} name="weightUnit" render={({ field }) => (
                                     <FormItem>
                                        <FormLabel>Unit</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                          <SelectContent>
                                             <SelectItem value="kg">kg</SelectItem>
                                             <SelectItem value="g">g</SelectItem>
                                             <SelectItem value="lb">lb</SelectItem>
                                          </SelectContent>
                                       </Select>
                                        <FormMessage />
                                     </FormItem>
                                  )} />
                                </div>
                                {/* @ts-ignore */}
                                <FormField control={form.control} name="shippingType" render={({ field }) => (
                                  <FormItem className="space-y-3">
                                    <FormLabel>Shipping Type</FormLabel>
                                    <FormControl>
                                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-2">
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                          <FormControl><RadioGroupItem value="seller" /></FormControl>
                                          <FormLabel className="font-normal">Fulfilled by Seller</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                          <FormControl><RadioGroupItem value="platform" /></FormControl>
                                          <FormLabel className="font-normal">Fulfilled by Platform</FormLabel>
                                        </FormItem>
                                      </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}/>
                             </CardContent>
                           </Card>
                        </div>
                     </form>
                  </Form>
               </div>
            </div>
         </ScrollArea>
      </div>
   );
}
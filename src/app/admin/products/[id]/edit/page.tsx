"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useParams } from "next/navigation";
import "quill/dist/quill.snow.css";
import { useCallback, useEffect, useState } from "react";
import { SubmitHandler, useForm, useWatch } from "react-hook-form";
import { useQuill } from "react-quilljs";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
   Form,
   FormControl,
   FormField,
   FormItem,
   FormLabel,
   FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Save, Upload, X } from "lucide-react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";

import { supabase as sb } from "@/integrations/supabase/client";
import type {
   CategoryWithSubcategories,
   Product,
   ProductBase,
   ProductImage,
   ProductStatus,
   ProductVariation,
   Subcategory,
} from "@/integrations/supabase/products";
import {
   fetchCategoriesWithSubcategories,
   fetchProductById,
   updateProduct,
} from "@/integrations/supabase/products";

// ... (Zod Schema, types, and helpers remain the same)
const ProductSchema = z.object({
   name: z.string().min(3, "Product name must be at least 3 characters"),
   description: z.string().optional(),
   category: z.string().min(1, "Category is required"),
   subCategory: z.string().min(1, "Sub category is required"),
   basePrice: z
      .string()
      .min(1, "Base price is required")
      .regex(/^\d+(\.\d+)?$/, "Price must be a valid number"),
   discountPrice: z
      .string()
      .optional()
      .refine((val) => !val || /^\d+(\.\d+)?$/.test(val), {
         message: "Discount price must be a valid number",
      }),
   weight: z
      .string()
      .regex(/^\d+(\.\d+)?$/, "Weight must be a valid number")
      .optional()
      .or(z.literal("")),
   weightUnit: z.string().default("kg"),
   size: z.string().optional(),
   color: z.string().optional(),
   stock: z
      .string()
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

interface QuillToolbar {
   addHandler: (name: string, handler: () => void) => void;
}

const uploadFileToBucket = async (
   file: File,
   bucket: string
): Promise<string> => {
   const fileExt = file.name.split(".").pop();
   const fileName = `${Date.now()}.${fileExt}`;
   const { error: uploadError } = await sb.storage
      .from(bucket)
      .upload(fileName, file);
   if (uploadError) throw uploadError;
   const { data } = sb.storage.from(bucket).getPublicUrl(fileName);
   return data.publicUrl;
};

export default function EditProductPage() {
   const router = useRouter();
   const params = useParams();
   const productId = params.id as string;

   const [product, setProduct] = useState<Product | null>(null);
   const [loading, setLoading] = useState(true);
   const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
   const [newImages, setNewImages] = useState<ProductImageFile[]>([]);
   const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
   const [categories, setCategories] = useState<CategoryWithSubcategories[]>(
      []
   );
   const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
   const { quill, quillRef } = useQuill({ theme: "snow" });

   const form = useForm({
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
      name: "category",
   });

   useEffect(() => {
      const loadInitialData = async () => {
         if (!productId) return;
         setLoading(true);
         try {
            const [fetchedCategories, productData] = await Promise.all([
               fetchCategoriesWithSubcategories(),
               fetchProductById(productId),
            ]);

            setCategories(fetchedCategories);

            if (productData?.product) {
               const { product, variations, images } = productData;
               setProduct(product);
               setExistingImages(images);

               const initialVariation = variations[0] || {};
               const initialAttributes = initialVariation.attributes || {};

               const formData: ProductFormData = {
                  name: product.name,
                  description: product.description || "",
                  category: product.category_id || "",
                  subCategory: product.subcategory_id || "",
                  basePrice: product.price.toString(),
                  discountPrice: product.compare_at_price?.toString() || "",
                  weight: product.weight_kg?.toString() || "",
                  weightUnit: "kg",
                  size: initialAttributes.size || "",
                  color: initialAttributes.color || "",
                  stock: (
                     initialVariation.stock ??
                     product.stock ??
                     0
                  ).toString(),
                  sku: product.sku || initialVariation.sku || "",
                  shippingType: product.requires_shipping
                     ? "seller"
                     : "platform",
               };
               form.reset(formData);
            }
         } catch (error) {
            console.error("Failed to load product data:", error);
         } finally {
            setLoading(false);
         }
      };
      loadInitialData();
   }, [productId, form.reset]); // form.reset is a stable function reference

   useEffect(() => {
      if (quill && product && product.description) {
         const editorIsEmpty = quill.getLength() <= 1;
         if (editorIsEmpty) {
            quill.root.innerHTML = product.description;
         }
      }
   }, [quill, product]); // Dependencies are the two things we need to be ready.

   useEffect(() => {
      if (selectedCategoryId) {
         const selectedCategory = categories.find(
            (c) => c.id === selectedCategoryId
         );
         setSubcategories(selectedCategory?.subcategories || []);
         if (product?.category_id !== selectedCategoryId) {
            form.setValue("subCategory", "");
         }
      } else {
         setSubcategories([]);
      }
   }, [selectedCategoryId, categories, form, product]);

   useEffect(() => {
      if (quill) {
         quill.on("text-change", () =>
            form.setValue("description", quill.root.innerHTML, {
               shouldValidate: true,
            })
         );
         const toolbar = quill.getModule("toolbar") as QuillToolbar | null;
         if (toolbar)
            toolbar.addHandler("image", () => {
               const input = document.createElement("input");
               input.setAttribute("type", "file");
               input.setAttribute("accept", "image/*");
               input.click();
               input.onchange = async () => {
                  const file = input.files?.[0];
                  if (file) {
                     try {
                        const url = await uploadFileToBucket(
                           file,
                           "prodct-content-bucket"
                        );
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
   }, [quill, form]);

   const onSubmit = async (data: ProductFormData, status: ProductStatus) => {
      try {
         const newImageUrls = await Promise.all(
            newImages.map((image) =>
               uploadFileToBucket(image.file, "product-images")
            )
         );

         const productUpdates: Partial<ProductBase> = {
            name: data.name,
            description: data.description,
            price: parseFloat(data.basePrice),
            compare_at_price: data.discountPrice
               ? parseFloat(data.discountPrice)
               : null,
            category_id: data.category,
            subcategory_id: data.subCategory,
            weight_kg: data.weight ? parseFloat(data.weight) : undefined,
            sku: data.sku || null,
            status: status,
         };

         const variations: ProductVariation[] = [];
         if (data.color || data.size) {
            variations.push({
               name: `${data.color || ""} ${data.size || ""}`.trim(),
               price: parseFloat(data.basePrice),
               stock: parseInt(data.stock, 10),
               sku: data.sku || null,
               attributes: {
                  ...(data.color && { color: data.color }),
                  ...(data.size && { size: data.size }),
               },
            });
         } else {
            productUpdates.stock = parseInt(data.stock, 10);
         }

         // First update the main product
         await updateProduct(
            productId,
            {
               ...productUpdates,
               main_image_url:
                  existingImages.length > 0
                     ? existingImages[0].url
                     : newImageUrls.length > 0
                     ? newImageUrls[0]
                     : null,
            },
            variations
         );

         // Then handle the image updates separately
         if (deletedImageIds.length > 0) {
            await Promise.all(
               deletedImageIds.map(async (id) => {
                  await sb.from("product_images").delete().eq("id", id);
               })
            );
         }

         if (newImageUrls.length > 0) {
            const newImages = newImageUrls.map((url, idx) => ({
               product_id: productId,
               url,
               is_primary: idx === 0 && existingImages.length === 0,
               position: existingImages.length + idx,
            }));
            await sb.from("product_images").insert(newImages);
         }
         router.push("/admin/products");
      } catch (error) {
         console.error("Failed to update product:", error);
      }
   };

   const handleSave = (status: ProductStatus) => {
      form.handleSubmit((data) => onSubmit(data, status))();
   };

   const onDrop = useCallback((acceptedFiles: File[]) => {
      const mappedFiles: ProductImageFile[] = acceptedFiles.map((file) => ({
         url: URL.createObjectURL(file),
         file,
      }));
      setNewImages((prev) => [...prev, ...mappedFiles]);
   }, []);

   const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: { "image/*": [] },
      multiple: true,
   });

   const removeNewImage = (index: number) => {
      setNewImages((prev) => {
         const newArr = prev.filter((_, i) => i !== index);
         URL.revokeObjectURL(prev[index].url);
         return newArr;
      });
   };

   const removeExistingImage = (image: ProductImage) => {
      setExistingImages((prev) => prev.filter((img) => img.id !== image.id));
      if (image.id) setDeletedImageIds((prev) => [...prev, image.id!]);
   };

   if (loading) {
      return (
         <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
         </div>
      );
   }

   if (!product) {
      return <div className="text-center mt-10">Product not found.</div>;
   }

   return (
      <div className="min-h-screen">
         <ScrollArea className="h-screen pb-8">
            <div className="p-6 pb-20">
               <div className="mx-auto">
                  <div className="flex justify-between md:items-center mb-6 flex-col gap-4 md:flex-row">
                     <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                           Edit Product
                        </h1>
                        <p className="text-sm text-gray-600 mt-1">
                           Update details for{" "}
                           <span className="font-medium">{product.name}</span>
                        </p>
                     </div>
                     <div className="flex gap-3">
                        <Button
                           variant="outline"
                           className="text-gray-600"
                           onClick={() => router.back()}
                        >
                           Cancel
                        </Button>
                        <Button
                           onClick={() => handleSave("draft")}
                           variant="secondary"
                           disabled={form.formState.isSubmitting}
                        >
                           <Save className="w-4 h-4 mr-2" />
                           {form.formState.isSubmitting
                              ? "Saving..."
                              : "Save as Draft"}
                        </Button>
                        <Button
                           onClick={() => handleSave("active")}
                           className="bg-green-600 hover:bg-green-700 text-white"
                           disabled={form.formState.isSubmitting}
                        >
                           <Plus className="w-4 h-4 mr-2" />
                           {form.formState.isSubmitting
                              ? "Publishing..."
                              : "Publish Product"}
                        </Button>
                     </div>
                  </div>
                  <Form {...form}>
                     <form className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                           <Card>
                              <CardContent className="p-6 space-y-4">
                                 <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                       <FormItem>
                                          <FormLabel>Product Name</FormLabel>
                                          <FormControl>
                                             <Input
                                                placeholder="e.g., Classic Wooden Chair"
                                                {...field}
                                             />
                                          </FormControl>
                                          <FormMessage />
                                       </FormItem>
                                    )}
                                 />
                                 <FormField
                                    control={form.control}
                                    name="description"
                                    render={() => (
                                       <FormItem>
                                          <FormLabel>Description</FormLabel>
                                          <FormControl>
                                             <div className="border rounded-md">
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
                              </CardContent>
                           </Card>
                           <Card>
                              <CardContent className="p-6 space-y-4">
                                 <FormField
                                    control={form.control}
                                    name="category"
                                    render={({ field }) => (
                                       <FormItem>
                                          <FormLabel>
                                             Product Category
                                          </FormLabel>
                                          <Select
                                             onValueChange={field.onChange}
                                             value={field.value}
                                          >
                                             <FormControl>
                                                <SelectTrigger>
                                                   <SelectValue placeholder="Select a category" />
                                                </SelectTrigger>
                                             </FormControl>
                                             <SelectContent>
                                                {categories.map((cat) => (
                                                   <SelectItem
                                                      key={cat.id}
                                                      value={cat.id}
                                                   >
                                                      {cat.name}
                                                   </SelectItem>
                                                ))}
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
                                          <FormLabel>Sub Category</FormLabel>
                                          <Select
                                             onValueChange={field.onChange}
                                             value={field.value}
                                             disabled={
                                                !selectedCategoryId ||
                                                subcategories.length === 0
                                             }
                                          >
                                             <FormControl>
                                                <SelectTrigger>
                                                   <SelectValue placeholder="Select a sub-category" />
                                                </SelectTrigger>
                                             </FormControl>
                                             <SelectContent>
                                                {subcategories.map((sub) => (
                                                   <SelectItem
                                                      key={sub.id}
                                                      value={sub.id}
                                                   >
                                                      {sub.name}
                                                   </SelectItem>
                                                ))}
                                             </SelectContent>
                                          </Select>
                                          <FormMessage />
                                       </FormItem>
                                    )}
                                 />
                              </CardContent>
                           </Card>
                           <Card>
                              <CardContent className="p-6 space-y-4">
                                 <p className="text-lg font-medium">
                                    Variants & Stock
                                 </p>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                       control={form.control}
                                       name="size"
                                       render={({ field }) => (
                                          <FormItem>
                                             <FormLabel>
                                                Size (Optional)
                                             </FormLabel>
                                             <FormControl>
                                                <Input
                                                   placeholder="e.g., Large, 42, 1TB"
                                                   {...field}
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
                                             <FormLabel>
                                                Color (Optional)
                                             </FormLabel>
                                             <FormControl>
                                                <Input
                                                   placeholder="e.g., Space Gray, Gold"
                                                   {...field}
                                                />
                                             </FormControl>
                                             <FormMessage />
                                          </FormItem>
                                       )}
                                    />
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                       control={form.control}
                                       name="stock"
                                       render={({ field }) => (
                                          <FormItem>
                                             <FormLabel>
                                                Stock Quantity
                                             </FormLabel>
                                             <FormControl>
                                                <Input
                                                   type="number"
                                                   placeholder="e.g., 100"
                                                   {...field}
                                                />
                                             </FormControl>
                                             <FormMessage />
                                          </FormItem>
                                       )}
                                    />
                                    <FormField
                                       control={form.control}
                                       name="sku"
                                       render={({ field }) => (
                                          <FormItem>
                                             <FormLabel>
                                                SKU (Stock Keeping Unit)
                                             </FormLabel>
                                             <FormControl>
                                                <Input
                                                   placeholder="e.g., CH-WDN-LG-BLK"
                                                   {...field}
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
                        <div className="space-y-6">
                           <Card>
                              <CardContent className="p-6 space-y-2">
                                 <h3 className="text-lg font-medium mb-2">
                                    Product Images
                                 </h3>
                                 <div
                                    {...getRootProps()}
                                    className="flex h-40 w-full items-center justify-center rounded-md border-2 border-dashed bg-gray-50 cursor-pointer"
                                 >
                                    <input {...getInputProps()} />
                                    <div className="text-center text-sm text-gray-500">
                                       <Upload className="h-8 w-8 mx-auto" />
                                       <p>
                                          {isDragActive
                                             ? "Drop the images here..."
                                             : "Drag & drop or click to upload"}
                                       </p>
                                    </div>
                                 </div>
                                 <div className="flex flex-wrap gap-2 mt-4">
                                    {existingImages.map((image) => (
                                       <div
                                          key={image.id}
                                          className="relative w-20 h-20 rounded-lg overflow-hidden border group"
                                       >
                                          <Image
                                             src={image.url}
                                             alt={`Existing image`}
                                             fill
                                             className="object-cover"
                                          />
                                          <button
                                             type="button"
                                             onClick={() =>
                                                removeExistingImage(image)
                                             }
                                             className="absolute top-1 right-1 h-5 w-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                                          >
                                             <X className="h-3 w-3" />
                                          </button>
                                       </div>
                                    ))}
                                    {newImages.map(({ url }, index) => (
                                       <div
                                          key={url}
                                          className="relative w-20 h-20 rounded-lg overflow-hidden border group"
                                       >
                                          <Image
                                             src={url}
                                             alt={`Preview ${index + 1}`}
                                             fill
                                             className="object-cover"
                                          />
                                          <button
                                             type="button"
                                             onClick={() =>
                                                removeNewImage(index)
                                             }
                                             className="absolute top-1 right-1 h-5 w-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                                          >
                                             <X className="h-3 w-3" />
                                          </button>
                                       </div>
                                    ))}
                                 </div>
                              </CardContent>
                           </Card>
                           <Card>
                              <CardContent className="p-6 space-y-4">
                                 <h3 className="text-lg font-medium mb-2">
                                    Pricing
                                 </h3>
                                 <FormField
                                    control={form.control}
                                    name="basePrice"
                                    render={({ field }) => (
                                       <FormItem>
                                          <FormLabel>Base Price</FormLabel>
                                          <FormControl>
                                             <Input
                                                placeholder="e.g., 150.00"
                                                {...field}
                                             />
                                          </FormControl>
                                          <FormMessage />
                                       </FormItem>
                                    )}
                                 />
                                 <FormField
                                    control={form.control}
                                    name="discountPrice"
                                    render={({ field }) => (
                                       <FormItem>
                                          <FormLabel>
                                             Discount Price (Optional)
                                          </FormLabel>
                                          <FormControl>
                                             <Input
                                                placeholder="125.00"
                                                {...field}
                                             />
                                          </FormControl>
                                          <FormMessage />
                                       </FormItem>
                                    )}
                                 />
                              </CardContent>
                           </Card>
                           <Card>
                              <CardContent className="p-6 space-y-4">
                                 <h3 className="text-lg font-medium mb-2">
                                    Delivery
                                 </h3>
                                 <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                       control={form.control}
                                       name="weight"
                                       render={({ field }) => (
                                          <FormItem>
                                             <FormLabel>Item Weight</FormLabel>
                                             <FormControl>
                                                <Input
                                                   placeholder="e.g., 2.1"
                                                   {...field}
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
                                             <FormLabel>Unit</FormLabel>
                                             <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                             >
                                                <FormControl>
                                                   <SelectTrigger>
                                                      <SelectValue />
                                                   </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                   <SelectItem value="kg">
                                                      kg
                                                   </SelectItem>
                                                   <SelectItem value="g">
                                                      g
                                                   </SelectItem>
                                                   <SelectItem value="lb">
                                                      lb
                                                   </SelectItem>
                                                </SelectContent>
                                             </Select>
                                             <FormMessage />
                                          </FormItem>
                                       )}
                                    />
                                 </div>
                                 <FormField
                                    control={form.control}
                                    name="shippingType"
                                    render={({ field }) => (
                                       <FormItem className="space-y-3">
                                          <FormLabel>Shipping Type</FormLabel>
                                          <FormControl>
                                             <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="space-y-2"
                                             >
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                   <FormControl>
                                                      <RadioGroupItem value="seller" />
                                                   </FormControl>
                                                   <FormLabel className="font-normal">
                                                      Fulfilled by Seller
                                                   </FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                   <FormControl>
                                                      <RadioGroupItem value="platform" />
                                                   </FormControl>
                                                   <FormLabel className="font-normal">
                                                      Fulfilled by Platform
                                                   </FormLabel>
                                                </FormItem>
                                             </RadioGroup>
                                          </FormControl>
                                          <FormMessage />
                                       </FormItem>
                                    )}
                                 />
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

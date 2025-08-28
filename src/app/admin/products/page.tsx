"use client";
import React from "react";
import { Plus, ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductsTable } from "@/components/admin/products-table";
import Link from "next/link";

// Main Products Page Component
const ProductsPage = () => {
   const products = [
      {
         id: 1,
         name: "Air Jordan 1 Retro High OG 'Black & White'",
         description: "Ready to hit the streets with sophistication.",
         category: "Shoes",
         stock: true,
         price: "25,000",
         qty: 32,
         status: "Scheduled",
         image: "👟",
      },
      {
         id: 2,
         name: "Nike Dri-FIT Micro Pique 2.0 Polo",
         description: "The best-selling Nike polo just got better.",
         category: "Fashion",
         stock: true,
         price: "25,000",
         qty: 31,
         status: "Delivered",
         image: "👕",
      },
      {
         id: 3,
         name: "Air Jordan 1 Retro",
         description: "A modern shoe built on the Air Jordan legacy.",
         category: "Shoes",
         stock: true,
         price: "25,000",
         qty: 21,
         status: "Delivered",
         image: "👟",
      },
      {
         id: 4,
         name: "iPhone 13 Pro Max",
         description: "iPhone 13 Pro Max, 128GB",
         category: "Electronic",
         stock: false,
         price: "25,000",
         qty: 121,
         status: "Cancel",
         image: "📱",
      },
      {
         id: 5,
         name: "2020 Apple iPad Pro 2nd Gen",
         description: "New advancements for upgraded performance",
         category: "Electronic",
         stock: true,
         price: "25,000",
         qty: 133,
         status: "Delivered",
         image: "📱",
      },
      {
         id: 6,
         name: "Apple 2021 iMac with M1 chip",
         description: "An immersive 24-inch 4.5K Retina display",
         category: "Electronic",
         stock: true,
         price: "25,000",
         qty: 233,
         status: "Delivered",
         image: "📱",
      },
      {
         id: 7,
         name: "MacBook Pro Laptop M2 Pro chip",
         description: "M2 Max takes power and speed to the next level",
         category: "Electronic",
         stock: true,
         price: "25,000",
         qty: 120,
         status: "Delivered",
         image: "📱",
      },
   ];

   return (
      <div className="min-h-screen  p-4 md:p-6">
         <div className="max-w-full mx-auto">
            {/* Header */}
            <div className="mb-6">
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
                  <div>
                     <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                        Products
                     </h1>
                     <p className="text-gray-600 mt-1">
                        Monitor your store&apos;s products to increase your sales.
                     </p>
                  </div>
                  <div className="flex items-center space-x-3">
                     <Button
                        variant="outline"
                        className="flex items-center space-x-2"
                     >
                        <ArrowUp className="w-4 h-4" />
                        <span className="hidden sm:inline">Export</span>
                     </Button>
                     <Link href="/admin/products/new">
                        <Button className="flex items-center space-x-2 bg-green-600 hover:bg-green-700">
                           <Plus className="w-4 h-4" />
                           <span>Add Product</span>
                        </Button>
                     </Link>
                  </div>
               </div>
            </div>

            {/* Products Table */}
            <ProductsTable products={products} />
         </div>
      </div>
   );
};

export default ProductsPage;

"use client";

import {
  fetchLandingPageProducts,
  StoreProduct,
} from "@/integrations/supabase/store";
import React, { FC, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Eye, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { useLanguage } from "@/contexts/LanguageContext";
import { WishlistButton } from "../ui/wishlist-button";

interface MoreToLoveProps {}

const ProductGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[1000px]:grid-cols-3 xl:grid-cols-4 gap-5">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="shrink-0 aspect-[9/12] bg-gray-200 rounded-2xl animate-pulse"
      />
    ))}
  </div>
);

// const ProductCard = ({ product }: { product: StoreProduct }) => (
//   <Link
//     href={`/products/${product.id}`}
//     className="shrink-0 group aspect-[9/12] bg-gray-100 rounded-2xl overflow-hidden relative"
//   >
//     <Image
//       src={product.main_image_url || "/placeholder.svg"}
//       alt={product.name}
//       fill
//       className="absolute object-cover z-0 group-hover:scale-105 transition-transform"
//     />
//     <div className="relative w-full z-10 text-lg h-full flex flex-col justify-between px-3 py-4 bg-gradient-to-t from-black/60 to-transparent">
//       <div className="w-full flex items-center justify-between">
//         <p className="px-4 py-1 text-white bg-red-500 rounded-full text-sm">
//           Hot
//         </p>
//         {(product.average_rating || null) && (
//           <p className="px-2 py-1 bg-white rounded-full flex items-center gap-1">
//             <Star fill="#eab308" size={14} className="text-warning" />{" "}
//             <span className="font-mono text-sm">
//               {product?.average_rating?.toFixed(1)}
//             </span>
//           </p>
//         )}
//       </div>
//       <div>
//         <h4 className="font-light text-white">
//           {product.brand || "New Arrival"}
//         </h4>
//         <div className="flex items-center justify-between text-white">
//           <p className="font-semibold truncate">{product.name}</p>{" "}
//           <span className="font-mono text-base">
//             RWF {product.price.toLocaleString()}
//           </span>
//         </div>
//         <p className="text-sm truncate text-white">
//           {product?.short_description}
//         </p>
//       </div>
//     </div>
//     <div className="z-20 absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100 bg-black/40 flex items-center justify-center">
//       <Button
//         variant={"secondary"}
//         className="hover:bg-white rounded-full h-14 w-14 p-1"
//       >
//         <Eye />
//       </Button>
//     </div>
//   </Link>
// );

const ProductCard = ({ product }: { product: StoreProduct }) => (
  <Link
    href={`/products/${product.id}`}
    className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition-shadow duration-300 border border-gray-100 h-full relative"
    aria-label={`View details for ${product.name}`}
    tabIndex={0}
  >
    {/* Hot badge (hidden on mobile) */}
    {/* <div className="absolute z-20 left-3 top-3"> */}
    {/* <span className="bg-red-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md tracking-widest">
        HOT
      </span> */}
    {/* <span className="inline-block bg-brand-orange text-white text-xs font-bold rounded-full px-2 py-0.5 mr-auto">
        RWF {product.price.toLocaleString()}
      </span> */}
    {/* </div> */}
    <div className="absolute z-20 left-3 top-3">
      {/* <span className="bg-red-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md tracking-widest">
            HOT
          </span> */}
      {/* <span className="inline-block bg-brand-orange text-white text-xs font-bold rounded-full px-2 py-0.5 mr-auto">
        RWF{" "}
        {product?.price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
      </span> */}
    </div>
    {/* Wishlist button */}
    <div className="absolute z-20 right-3 top-3">
      <WishlistButton
        productId={product.id}
        size="sm"
        variant="ghost"
        className="bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
      />
    </div>
    {/* Product Image */}
    <div className="relative w-full aspect-[4/5] bg-gray-100">
      <Image
        src={product.main_image_url || "/placeholder.svg"}
        alt={product.name}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, 33vw"
      />
    </div>
    {/* Card Content */}
    <div className="flex flex-col flex-1 px-3 md:px-4 pt-3 pb-4 gap-2">
      {/* Brand, Rating, Price */}
      {/* <div className="flex flex-col md:flex-row flex-wrap md:items-center justify-between gap-x-2 gap-y-1 mb-1">
        <span className="text-xs text-gray-500 font-semibold truncate w-full md:max-w-[40%] ">
          {product.brand || "New Arrival"}
        </span>
        {(product.average_rating || null) && (
          <span className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5 text-xs font-mono">
            <Star fill="#eab308" size={13} className="text-warning" />
            {product?.average_rating?.toFixed(1)}
          </span>
        )}
        <span className="inline-block bg-brand-orange text-white text-xs font-bold rounded-full px-2 py-0.5 mr-auto">
          RWF {product.price.toLocaleString()}
        </span>
      </div> */}
      {/* Product Name */}
      <span className="text-orange-500 text-lg md:text-xl font-bold">
        RWF{" "}
        {product?.price.toLocaleString("en-US", {
          // minimumFractionDigits: 2,
          // maximumFractionDigits: 2,
        })}{" "}
      </span>
      <h4 className="font-bold text-gray-900 text-base md:text-lg line-clamp-2 truncate">
        {product.name}
      </h4>
      {/* Description */}
      {/* <p className="text-xs md:text-sm text-gray-600 line-clamp-2">
        {product?.short_description}
      </p> */}
    </div>
  </Link>
);

const MoreToLove: FC<MoreToLoveProps> = ({}) => {
  const { t } = useLanguage();

  const [moreToLove, setMoreToLove] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const initialLimit = 12;
  const loadMoreLimit = 8;

  // Load initial products
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const products = await fetchLandingPageProducts({
          limit: initialLimit,
          offset: 0,
        });
        setMoreToLove(products);
        setOffset(initialLimit); // ✅ track how many fetched
      } catch (error) {
        console.error("Failed to load landing page data", error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Load more products
  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const newProducts = await fetchLandingPageProducts({
        limit: loadMoreLimit,
        offset, // ✅ fetch from the next position
      });
      setMoreToLove((prev) => [...prev, ...newProducts]);
      setOffset((prev) => prev + newProducts.length); // ✅ increment offset
    } catch (error) {
      console.error("Failed to fetch more products", error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mb-20">
      <MaxWidthWrapper size={"lg"} className="">
        <h3 className="lg:text-4xl md:text-2xl text-xl font-bold text-neutral-900 mb-8">
          {t("home.more")}
        </h3>

        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <>
            <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-4 gap-2 md:gap-5">
              {moreToLove.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="flex justify-center mt-10">
              <Button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-3 rounded-full"
              >
                {loadingMore ? t("common.loading") : t("common.loadMore")}
              </Button>
            </div>
          </>
        )}
      </MaxWidthWrapper>
    </div>
  );
};

export default MoreToLove;

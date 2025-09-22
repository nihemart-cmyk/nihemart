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

const ProductCard = ({ product }: { product: StoreProduct }) => (
  <Link
    href={`/products/${product.id}`}
    className="shrink-0 group aspect-[9/12] bg-gray-100 rounded-2xl overflow-hidden relative"
  >
    <Image
      src={product.main_image_url || "/placeholder.svg"}
      alt={product.name}
      fill
      className="absolute object-cover z-0 group-hover:scale-105 transition-transform"
    />
    <div className="relative w-full z-10 text-lg h-full flex flex-col justify-between px-3 py-4 bg-gradient-to-t from-black/60 to-transparent">
      <div className="w-full flex items-center justify-between">
        <p className="px-4 py-1 text-white bg-red-500 rounded-full text-sm">
          Hot
        </p>
        {(product.average_rating || null) && (
          <p className="px-2 py-1 bg-white rounded-full flex items-center gap-1">
            <Star fill="#eab308" size={14} className="text-warning" />{" "}
            <span className="font-mono text-sm">
              {product?.average_rating?.toFixed(1)}
            </span>
          </p>
        )}
      </div>
      <div>
        <h4 className="font-light text-white">
          {product.brand || "New Arrival"}
        </h4>
        <div className="flex items-center justify-between text-white">
          <p className="font-semibold truncate">{product.name}</p>{" "}
          <span className="font-mono text-base">
            RWF {product.price.toLocaleString()}
          </span>
        </div>
        <p className="text-sm truncate text-white">
          {product?.short_description}
        </p>
      </div>
    </div>
    <div className="z-20 absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100 bg-black/40 flex items-center justify-center">
      <Button
        variant={"secondary"}
        className="hover:bg-white rounded-full h-14 w-14 p-1"
      >
        <Eye />
      </Button>
    </div>
  </Link>
);

const MoreToLove: FC<MoreToLoveProps> = ({}) => {
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
        <h3 className="text-4xl font-bold text-neutral-900 mb-8">
          More To Love
        </h3>

        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <>
            <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[1000px]:grid-cols-3 xl:grid-cols-4 gap-5">
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
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          </>
        )}
      </MaxWidthWrapper>
    </div>
  );
};

export default MoreToLove;
"use client";

import {
  fetchLandingPageProducts,
  StoreProduct,
} from "@/integrations/supabase/store";
import React, { FC, useEffect, useState } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import Link from "next/link";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { useLanguage } from "@/contexts/LanguageContext";
import { WishlistButton } from "../ui/wishlist-button";

interface MoreToLoveProps {}

const ProductGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-4 gap-1.5 md:gap-5">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="shrink-0 aspect-[3/3.8] sm:aspect-[4/5] bg-gray-200 rounded-xl animate-pulse"
      />
    ))}
  </div>
);

const ProductCard = ({ product }: { product: StoreProduct }) => (
  <Link
    href={`/products/${product.id}`}
    className="group flex flex-col bg-white rounded-xl overflow-hidden shadow hover:shadow-lg transition-all duration-300 border border-gray-100 h-full relative"
    aria-label={`View details for ${product.name}`}
    tabIndex={0}
  >
    {/* Wishlist Button */}
    <div className="absolute z-20 right-2 top-2">
      <WishlistButton
        productId={product.id}
        size="sm"
        variant="ghost"
        className="bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
      />
    </div>

    <div className="relative w-full h-[120px] md:h-[35vh] bg-gray-100">
      <Image
        src={product.main_image_url || "/placeholder.svg"}
        alt={product.name}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, 33vw"
      />
    </div>

    {/* ✅ More compact text area */}
    <div className="flex flex-col flex-1 px-2 pt-1 pb-2 gap-0.5 sm:gap-1.5">
      <span className="text-orange-500 text-xs sm:text-sm md:text-lg font-bold">
        RWF {product.price.toLocaleString()}
      </span>
      <h4 className="font-semibold text-gray-900 text-[11px] sm:text-sm md:text-base line-clamp-2">
        {product.name}
      </h4>
    </div>
  </Link>
);

const MoreToLove: FC<MoreToLoveProps> = ({}) => {
  const { t } = useLanguage();

  const [moreToLove, setMoreToLove] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const initialLimit = 15;
  const loadMoreLimit = 10;

  // Load initial products
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const products = await fetchLandingPageProducts({
          limit: initialLimit,
          sortBy: "short_description",
        });
        setMoreToLove(products);
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
        offset,
        sortBy: "short_description",
      });
      setMoreToLove((prev) => [...prev, ...newProducts]);
      setOffset((prev) => prev + newProducts.length);
    } catch (error) {
      console.error("Failed to fetch more products", error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mb-20">
      <MaxWidthWrapper size={"lg"}>
        <h3 className="lg:text-4xl md:text-2xl text-xl font-bold text-neutral-900 mb-5">
          {t("home.more")}
        </h3>

        {loading ? (
          <ProductGridSkeleton count={15} />
        ) : (
          <>
            {/* ✅ Compact grid layout for better mobile fit */}
            <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-5 gap-1.5 md:gap-5">
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

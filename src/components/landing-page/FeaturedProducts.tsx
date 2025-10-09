"use client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ChevronLeft, ChevronRight, Eye, Star } from "lucide-react";
import Image from "next/image";
import { FC, useState, useEffect } from "react";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { Button } from "../ui/button";
import { useMediaQuery } from "@/hooks/user-media-query";
import {
  fetchProductsUnder15k,
  fetchStoreCategories,
} from "@/integrations/supabase/store";
import { optimizeImageUrl } from "@/lib/utils";
import type {
  StoreProduct,
  StoreCategorySimple,
} from "@/integrations/supabase/store";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface FeaturedProductsProps {}

const promos = [
  "5% ON NEW PRODUCTS",
  "5% ON NEW PRODUCTS",
  "5% ON NEW PRODUCTS",
  "5% ON NEW PRODUCTS",
];

const FeaturedProducts: FC<FeaturedProductsProps> = ({}) => {
  const { t } = useLanguage();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [categories, setCategories] = useState<StoreCategorySimple[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const BUTTON_SIZE = useMediaQuery("(min-width: 768px)") ? "lg" : "sm";

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setLoadingFilters(true);
      try {
        const [cats, prods] = await Promise.all([
          fetchStoreCategories(),
          fetchProductsUnder15k(),
        ]);
        setCategories(cats);
        setProducts(prods);
      } catch (error) {
        console.error("Failed to load featured products data:", error);
      } finally {
        setLoading(false);
        setLoadingFilters(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    // This effect only runs when a filter is clicked, not on initial load
    if (loadingFilters) return;

    const loadFilteredProducts = async () => {
      setLoading(true);
      try {
        const prods = await fetchProductsUnder15k(
          selectedCategoryId === "all" ? undefined : selectedCategoryId
        );
        setProducts(prods);
      } catch (error) {
        console.error("Failed to filter products:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFilteredProducts();
  }, [selectedCategoryId, loadingFilters]);

  return (
    <MaxWidthWrapper size={"lg"} className="my-20">
      <h3 className="text-4xl font-bold text-neutral-900 mb-5">
        {t("home.under")} <span className="text-brand-orange">RWF 15,000</span>
      </h3>
      <div className="flex items-center flex-wrap gap-3 mb-8">
        <Button
          size={BUTTON_SIZE}
          className="rounded-full"
          variant={selectedCategoryId === "all" ? "default" : "secondary"}
          onClick={() => setSelectedCategoryId("all")}
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            size={BUTTON_SIZE}
            className="rounded-full"
            key={cat.id}
            variant={selectedCategoryId === cat.id ? "default" : "secondary"}
            onClick={() => setSelectedCategoryId(cat.id)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      <Carousel
        opts={{ align: "start", loop: true }}
        className="w-full mt-12 sm:mt-0"
      >
        <CarouselContent>
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <CarouselItem
                key={index}
                className="basis-[80%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/5"
              >
                <div className="shrink-0 group aspect-[9/12] bg-gray-200 rounded-2xl animate-pulse" />
              </CarouselItem>
            ))
          ) : products.length > 0 ? (
            products.map((product) => (
              <CarouselItem
                key={product.id}
                className="basis-[80%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 mb-5"
              >
                <Link
                  href={`/products/${product.id}`}
                  className="group block h-full"
                  aria-label={`View details for ${product.name}`}
                  tabIndex={0}
                >
                  <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col h-full relative border border-gray-100">
                    {/* Hot Ribbon (hidden on mobile for less clutter) */}
                    <div className="absolute z-20 left-0 top-4">
                      <div className="pl-2">
                        {/* <span className="bg-red-500 text-white text-[10px] font-bold px-6 py-1 rounded shadow-md tracking-widest drop-shadow-lg">
                          HOT
                        </span> */}
                        {/* <span className="inline-block bg-brand-orange text-white text-xs font-bold rounded-full px-2 py-0.5 ml-auto">
                          RWF {product.price.toLocaleString()}
                        </span> */}
                      </div>
                    </div>
                    {/* Product Image */}
                    <div className="relative w-full aspect-[4/5] bg-gradient-to-br from-blue-100 to-blue-50 overflow-hidden">
                      <Image
                        src={optimizeImageUrl(product.main_image_url, { width: 300, height: 400, quality: 80 })}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
                    </div>
                    {/* Card Content */}
                    <div className="flex flex-col flex-1 px-3 md:px-4 pt-2 md:pt-3 pb-4 md:pb-5 gap-2">
                      {/* Brand, Rating, Price */}
                      {/* <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                        <span className="text-xs text-gray-500 font-semibold truncate max-w-[40%]">
                          {product.brand || "New Arrival"}
                        </span>
                        {(product?.average_rating || null) && (
                          <span className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5 text-xs font-mono">
                            <Star
                              fill="#eab308"
                              size={13}
                              className="text-warning"
                            />
                            {product?.average_rating?.toFixed(1)}
                          </span>
                        )}
                        <span className="inline-block bg-brand-orange text-white text-xs font-bold rounded-full px-2 py-0.5 ml-auto">
                          RWF {product.price.toLocaleString()}
                        </span>
                      </div> */}
                      {/* Product Name */}
                      <span className="text-orange-500 text-lg md:text-xl font-bold">
                          RWF {product.price.toLocaleString()}
                        </span>
                      <h4 className="font-bold text-gray-900 text-base md:text-lg truncate">
                        {product.name}
                      </h4>
                      {/* Description */}
                      {/* <p className="text-xs md:text-sm text-gray-600 line-clamp-2 relative">
                        {product?.short_description}
                        <span className="absolute bottom-0 right-0 w-8 h-4 bg-gradient-to-l from-white/90 to-transparent pointer-events-none" />
                      </p> */}
                      <div className="flex-1" />
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            ))
          ) : (
            <div className="w-full text-center py-10 col-span-full">
              <p>No products found in this category.</p>
            </div>
          )}
        </CarouselContent>
        <CarouselPrevious
          Icon={ChevronLeft}
          className="-top-7 sm:-top-12 right-10 left-auto"
        />
        <CarouselNext
          Icon={ChevronRight}
          className="-top-7 sm:-top-12 left-auto right-0"
        />
      </Carousel>

      <div className="bg-brand-orange mt-10 sm:mt-20 mb-16 sm:mb-24 text-white rounded-xl py-2 overflow-hidden">
        <div className="flex items-center">
          {promos.map((promo, i) => (
            <p
              key={`promo1-${i}`}
              className="shrink-0 pl-5 whitespace-nowrap animate-marquee"
            >
              {promo}
            </p>
          ))}
          {promos.map((promo, i) => (
            <p
              key={`promo2-${i}`}
              className="shrink-0 pl-5 whitespace-nowrap animate-marquee"
              style={{ animationDelay: "15s" }}
            >
              {promo}
            </p>
          ))}
        </div>
      </div>
    </MaxWidthWrapper>
  );
};

export default FeaturedProducts;

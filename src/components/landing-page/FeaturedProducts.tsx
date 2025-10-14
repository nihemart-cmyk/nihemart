"use client";
import { FC, useState, useEffect } from "react";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { Button } from "../ui/button";
import { useMediaQuery } from "@/hooks/user-media-query";
import {
  fetchProductsUnder15k,
  fetchStoreCategories,
  StoreProduct,
  StoreCategorySimple,
} from "@/integrations/supabase/store";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import { WishlistButton } from "../ui/wishlist-button";

// ✅ Import Carousel
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface FeaturedProductsProps {}

const promos = [
  "5% ON NEW PRODUCTS",
  "5% ON NEW PRODUCTS",
  "5% ON NEW PRODUCTS",
  "5% ON NEW PRODUCTS",
];

const ProductCard = ({ product }: { product: StoreProduct }) => (
  <Link
    href={`/products/${product.id}`}
    className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition-shadow duration-300 border border-gray-100 h-full relative"
    aria-label={`View details for ${product.name}`}
    tabIndex={0}
  >
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
      <span className="text-orange-500 text-lg md:text-xl font-bold">
        RWF {product?.price.toLocaleString()}
      </span>
      <h4 className="font-bold text-gray-900 text-base md:text-lg line-clamp-2 truncate">
        {product.name}
      </h4>
    </div>
  </Link>
);

const FeaturedProducts: FC<FeaturedProductsProps> = () => {
  const { t } = useLanguage();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [categories, setCategories] = useState<StoreCategorySimple[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [offset, setOffset] = useState(0);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const BUTTON_SIZE = isDesktop ? "lg" : "sm";

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setLoadingFilters(true);
      try {
        const [cats, prods] = await Promise.all([
          fetchStoreCategories(),
          fetchProductsUnder15k(undefined),
        ]);
        setCategories(cats);
        setProducts(prods);
        setOffset(prods.length);
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
    if (loadingFilters) return;
    const loadFilteredProducts = async () => {
      setLoading(true);
      try {
        const prods = await fetchProductsUnder15k(
          selectedCategoryId === "all" ? undefined : selectedCategoryId
        );
        setProducts(prods);
        setOffset(prods.length);
      } catch (error) {
        console.error("Failed to filter products:", error);
      } finally {
        setLoading(false);
      }
    };
    loadFilteredProducts();
  }, [selectedCategoryId, loadingFilters]);

  return (
    <MaxWidthWrapper size={"lg"} className="lg:my-14">
      <h3 className="lg:text-4xl md:text-2xl text-xl font-bold text-neutral-900 lg:mb-5">
        {t("home.under")} <span className="text-brand-orange">RWF 15,000</span>
      </h3>

      {/* Category Buttons */}
      <div className="hidden md:flex items-center flex-wrap gap-3 mb-8">
        <Button
          size={BUTTON_SIZE}
          className="rounded-full hidden md:block"
          variant={selectedCategoryId === "all" ? "default" : "secondary"}
          onClick={() => setSelectedCategoryId("all")}
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            size={BUTTON_SIZE}
            className="rounded-full hidden md:block"
            key={cat.id}
            variant={selectedCategoryId === cat.id ? "default" : "secondary"}
            onClick={() => setSelectedCategoryId(cat.id)}
          >
            {cat.name}
          </Button>
        ))}
      </div>

      {/* ✅ Desktop Grid / ✅ Mobile Carousel */}
      {loading ? (
        <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 aspect-[9/12] bg-gray-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : isDesktop ? (
        <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-5 gap-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        // ✅ Mobile Carousel (2x2 layout per slide)
        <Carousel opts={{ loop: true }} plugins={[Autoplay()]} className="relative pt-10">
          <CarouselContent>
            {Array.from({ length: Math.ceil(products.length / 4) }).map((_, i) => {
              const slideProducts = products.slice(i * 4, i * 4 + 4);
              return (
                <CarouselItem key={i} className="basis-full">
                  <div className="grid grid-cols-2 gap-2">
                    {slideProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="group flex flex-col bg-white rounded-xl overflow-hidden shadow border border-gray-100 relative h-[210px]"
                      >
                        {/* Wishlist */}
                        <div className="absolute z-20 right-2 top-2">
                          <WishlistButton
                            productId={product.id}
                            size="sm"
                            variant="ghost"
                            className="bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
                          />
                        </div>
                        {/* Image */}
                        <div className="relative w-full h-[120px] bg-gray-100">
                          <Image
                            src={product.main_image_url || "/placeholder.svg"}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        {/* Content */}
                        <div className="flex flex-col flex-1 px-2 pt-2 pb-3">
                          <span className="text-orange-500 text-sm font-bold">
                            RWF {product.price.toLocaleString()}
                          </span>
                          <h4 className="font-semibold text-gray-900 text-xs line-clamp-2">
                            {product.name}
                          </h4>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>

          {/* ✅ Move navigation inside Carousel */}
          <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-600 bg-white/80 backdrop-blur-sm rounded-full shadow-sm" />
          <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-600 bg-white/80 backdrop-blur-sm rounded-full shadow-sm" />
        </Carousel>
      )}

      {/* Promo Marquee */}
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
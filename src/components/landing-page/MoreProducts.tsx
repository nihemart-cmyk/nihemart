"use client";
import { FC, useState, useEffect, useMemo } from "react";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { Button } from "../ui/button";
import Image from "next/image";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/user-media-query";
import { fetchLandingPageProducts } from "@/integrations/supabase/store";
import { optimizeImageUrl } from "@/lib/utils";
import type {
  StoreProduct,
  StoreCategorySimple,
} from "@/integrations/supabase/store";
import { useLanguage } from "@/contexts/LanguageContext";
import { WishlistButton } from "@/components/ui/wishlist-button";
import { Icons } from "../icons";
// Carousel for mobile one-row slider
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface MoreProductsProps {}

const promos = [
  "5% ON NEW PRODUCTS",
  "5% ON NEW PRODUCTS",
  "5% ON NEW PRODUCTS",
  "5% ON NEW PRODUCTS",
];

const services = [
  { label: "Customer service", Icon: Icons.landingPage.headSets },
  { label: "Fast Delivery", Icon: Icons.landingPage.ship },
  { label: "Refer a friend", Icon: Icons.landingPage.friends },
  { label: "Secure payment", Icon: Icons.landingPage.verified },
];

// make card slightly smaller on mobile: reduced image height and tighter paddings
const ProductCard = ({ product }: { product: StoreProduct }) => (
  <Link
    href={`/products/${product.id}`}
    className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition-shadow duration-300 border border-gray-100 relative h-[260px] md:h-auto"
    aria-label={`View details for ${product.name}`}
    tabIndex={0}
  >
    {/* Wishlist + mobile price badge (matches FeaturedProducts) */}
    <div className="absolute z-20 top-3 flex justify-between w-full px-2">
      <span className="md:hidden text-white bg-orange-500 my-auto py-1 px-3 text-center rounded-lg text-sm font-bold">
        RWF {product.price.toLocaleString()}
      </span>
      <WishlistButton
        productId={product.id}
        size="sm"
        variant="ghost"
        className="bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
      />
    </div>

    {/* Image area (reduced on mobile) */}
    <div className="relative w-full aspect-[3/4] md:aspect-[4/5] bg-gray-100">
      <Image
        src={optimizeImageUrl(product.main_image_url, {
          width: 400,
          height: 480,
          quality: 80,
        })}
        alt={product.name}
        fill
        className="object-fit transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, 33vw"
      />
    </div>

    {/* Desktop content hidden on mobile (same behaviour as FeaturedProducts) */}
    <div className="flex-col flex-1 px-3 md:px-4 pt-2 md:pt-3 pb-3 gap-1 hidden md:flex">
      <span className="text-orange-500 text-base md:text-lg font-bold">
        RWF {product.price.toLocaleString()}
      </span>
      <h4 className="font-bold text-gray-900 text-sm md:text-base line-clamp-2 truncate">
        {product.name}
      </h4>
    </div>
  </Link>
);

const ProductGridSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-5">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="shrink-0 aspect-[3/4] sm:aspect-[4/5] bg-gray-200 rounded-2xl animate-pulse"
      />
    ))}
  </div>
);

const MoreProducts: FC<MoreProductsProps> = ({}) => {
  const { t } = useLanguage();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [allFeatured, setAllFeatured] = useState<StoreProduct[]>([]);
  const [latestProducts, setLatestProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  // use boolean for breakpoint checks so conditional rendering works correctly
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const ButtonSize = isDesktop ? "lg" : "sm";

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [featured, latest] = await Promise.all([
          fetchLandingPageProducts({ featured: true, limit: 15 }),
          fetchLandingPageProducts({ featured: false, limit: 15 }),
        ]);
        setAllFeatured(featured);
        setLatestProducts(latest);
      } catch (error) {
        console.error("Failed to load landing page data", error);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const categories = useMemo(() => {
    if (!allFeatured) return [];
    const categoryMap = new Map<string, StoreCategorySimple>();
    allFeatured.forEach((product) => {
      if (product.category) {
        categoryMap.set(product.category.id, {
          id: product.category.id,
          name: product.category.name,
        });
      }
    });
    return Array.from(categoryMap.values());
  }, [allFeatured]);

  const filteredFeaturedProducts = useMemo(() => {
    if (selectedCategoryId === "all") {
      return allFeatured;
    }
    return allFeatured.filter(
      (product) => product.category?.id === selectedCategoryId
    );
  }, [selectedCategoryId, allFeatured]);

  return (
    <div>
      <MaxWidthWrapper size={"lg"}>
        {/* Featured Section */}
        {/* <h3 className="lg:text-4xl md:text-2xl text-xl font-bold text-neutral-900 mb-5">
          {t("home.featured")}
        </h3> */}

        {/* Category Buttons */}
        {/* <div className="flex items-center flex-wrap gap-3 mb-6">
          <Button
            size={ButtonSize}
            className="rounded-full hidden md:block"
            variant={selectedCategoryId === "all" ? "default" : "secondary"}
            onClick={() => setSelectedCategoryId("all")}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              size={ButtonSize}
              className="rounded-full hidden md:block"
              key={cat.id}
              variant={selectedCategoryId === cat.id ? "default" : "secondary"}
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div> */}

        {/* Featured Products */}
        {/* {loading ? (
          <ProductGridSkeleton count={12} />
        ) : (
          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-5">
            {filteredFeaturedProducts.length > 0 ? (
              filteredFeaturedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <p className="col-span-full text-center">
                No featured products found in this category.
              </p>
            )}
          </div>
        )} */}

        {/* Promo Banner */}
        {/* <div className="bg-brand-orange mt-10 sm:mt-20 mb-16 sm:mb-24 text-white rounded-xl py-2 overflow-hidden">
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
        </div> */}

        {/* New Arrivals Section */}
        <h3 className="lg:text-4xl md:text-2xl text-xl font-bold text-neutral-900 my-5 lg:my-20">
          {t("home.new")}
        </h3>

        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : // show grid on desktop, single-row carousel on mobile (match FeaturedProducts layout)
        isDesktop ? (
          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-5">
            {latestProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <Carousel
            opts={{ loop: true }}
            plugins={[Autoplay()]}
            className="relative pt-6"
          >
            <CarouselContent>
              {latestProducts.map((product) => (
                <CarouselItem
                  key={product.id}
                  className="basis-3/4 sm:basis-3/4"
                >
                  <div className="px-3">
                    <ProductCard product={product} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-600 bg-white/80 backdrop-blur-sm rounded-full shadow-sm" />
            <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-500 hover:text-orange-600 bg-white/80 backdrop-blur-sm rounded-full shadow-sm" />
          </Carousel>
        )}
      </MaxWidthWrapper>

      {/* Services Section */}
      <MaxWidthWrapper
        size={"lg"}
        className="grid grid-cols-2 md:grid-cols-4 gap-5 my-10 lg:my-20"
      >
        {services.map(({ label, Icon }, i) => (
          <div key={i} className="flex flex-col items-center text-center gap-2">
            <Icon />
            <p className="font-semibold">{label}</p>
          </div>
        ))}
      </MaxWidthWrapper>
    </div>
  );
};

export default MoreProducts;

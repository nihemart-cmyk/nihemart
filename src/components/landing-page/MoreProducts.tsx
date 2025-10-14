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

interface MoreProductsProps {}

const promos = [
  "5% ON NEW PRODUCTS",
  "5% ON NEW PRODUCTS",
  "5% ON NEW PRODUCTS",
  "5% ON NEW PRODUCTS",
];

const services = [
  { label: "Customer service", Icon: Icons.landingPage.headSets },
  { label: "Fast free shipping", Icon: Icons.landingPage.ship },
  { label: "Refer a friend", Icon: Icons.landingPage.friends },
  { label: "Secure payment", Icon: Icons.landingPage.verified },
];

const ProductCard = ({ product }: { product: StoreProduct }) => (
  <div className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition-shadow duration-300 border border-gray-100 relative">
    {/* Wishlist button */}
    <div className="absolute z-20 right-3 top-3">
      <WishlistButton
        productId={product.id}
        size="sm"
        variant="ghost"
        className="bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
      />
    </div>

    {/* ✅ Adjusted image height for smaller mobile cards */}
    <Link
      href={`/products/${product.id}`}
      className="relative w-full bg-gray-100 block"
      aria-label={`View details for ${product.name}`}
      tabIndex={0}
    >
      <div className="relative w-full h-[120px] md:h-[35vh] bg-gray-100">
        <Image
          src={optimizeImageUrl(product.main_image_url, {
            width: 300,
            height: 400,
            quality: 80,
          })}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, 33vw"
        />
      </div>
    </Link>

    {/* ✅ Reduced vertical spacing and text size on mobile */}
    <div className="flex flex-col flex-1 px-2 md:px-4 pt-2 pb-3 gap-1 sm:gap-2">
      <span className="text-orange-500 text-sm sm:text-lg md:text-xl font-bold">
        RWF {product.price.toLocaleString()}
      </span>
      <h4 className="font-bold text-gray-900 text-xs sm:text-base md:text-lg line-clamp-2 truncate">
        {product.name}
      </h4>
    </div>
  </div>
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
  const ButtonSize = useMediaQuery("(min-width: 768px)") ? "lg" : "sm";

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [featured, latest] = await Promise.all([
          fetchLandingPageProducts({ featured: true, limit: 12 }),
          fetchLandingPageProducts({ featured: false, limit: 8 }),
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
        <h3 className="lg:text-4xl md:text-2xl text-xl font-bold text-neutral-900 mb-5">
          {t("home.featured")}
        </h3>

        {/* Category Buttons */}
        <div className="flex items-center flex-wrap gap-3 mb-6">
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
        </div>

        {/* Featured Products */}
        {loading ? (
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
        )}

        {/* Promo Banner */}
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

        {/* New Arrivals Section */}
        <h3 className="lg:text-4xl md:text-2xl text-xl font-bold text-neutral-900 mb-8 mt-20">
          {t("home.new")}
        </h3>

        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-5">
            {latestProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </MaxWidthWrapper>

      {/* Services Section */}
      <MaxWidthWrapper
        size={"lg"}
        className="grid grid-cols-2 md:grid-cols-4 gap-5 my-20"
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

"use client";
import { FC, useState, useEffect, useMemo } from "react";
import MaxWidthWrapper from "../MaxWidthWrapper";
import { Button } from "../ui/button";
import Image from "next/image";
import Link from "next/link";
import { Eye, Star } from "lucide-react";
import MarqueeBanner from "./MarqueeBanner";
import { Icons } from "../icons";
import { useMediaQuery } from "@/hooks/user-media-query";
import { fetchLandingPageProducts } from "@/integrations/supabase/store";
import type {
  StoreProduct,
  StoreCategorySimple,
} from "@/integrations/supabase/store";
import { useLanguage } from "@/contexts/LanguageContext";
import { WishlistButton } from "@/components/ui/wishlist-button";

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
  <div className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition-shadow duration-300 border border-gray-100 h-full relative">
    {/* Hot badge (hidden on mobile) */}
    <div className="absolute z-20 left-3 top-3">
      {/* <span className="bg-red-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md tracking-widest">
        HOT
      </span> */}
      <span className="inline-block bg-brand-orange text-white text-xs font-bold rounded-full px-2 py-0.5 mr-auto">
        RWF {product.price.toLocaleString()}
      </span>
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
    <Link
      href={`/products/${product.id}`}
      className="relative w-full aspect-[4/5] bg-gray-100 block"
      aria-label={`View details for ${product.name}`}
      tabIndex={0}
    >
      <Image
        src={product.main_image_url || "/placeholder.svg"}
        alt={product.name}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, 33vw"
      />
    </Link>
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
      <h4 className="font-bold text-gray-900 text-base md:text-lg line-clamp-2 truncate">
        {product.name}
      </h4>
      {/* Description */}
      <p className="text-xs md:text-sm text-gray-600 line-clamp-2">
        {product?.short_description}
      </p>
    </div>
  </div>
);

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
      <MaxWidthWrapper size={"lg"} className="">
        <h3 className="text-4xl font-bold text-neutral-900 mb-5">
          {t("home.featured")}
        </h3>
        <div className="flex items-center flex-wrap gap-3 mb-8">
          <Button
            size={ButtonSize}
            className="rounded-full"
            variant={selectedCategoryId === "all" ? "default" : "secondary"}
            onClick={() => setSelectedCategoryId("all")}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              size={ButtonSize}
              className="rounded-full"
              key={cat.id}
              variant={selectedCategoryId === cat.id ? "default" : "secondary"}
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {loading ? (
          <ProductGridSkeleton count={12} />
        ) : (
          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-4 gap-2 md:gap-5">
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

        <h3 className="text-4xl font-bold text-neutral-900 mb-8 mt-20">
          {t("home.new")}
        </h3>

        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-2 min-[500px]:grid-cols-3 min-[1000px]:grid-cols-4 xl:grid-cols-4 gap-2 md:gap-5">
            {latestProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </MaxWidthWrapper>
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
      {/* <MarqueeBanner /> */}
    </div>
  );
};

export default MoreProducts;

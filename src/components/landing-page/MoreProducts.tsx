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
          Featured products
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
          <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[1000px]:grid-cols-3 xl:grid-cols-4 gap-5">
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
          New arrivals
        </h3>

        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[1000px]:grid-cols-3 xl:grid-cols-4 gap-5">
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
      <MarqueeBanner />
    </div>
  );
};

export default MoreProducts;

"use client";
import { cn } from "@/lib/utils";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { FC, RefObject, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchCategories } from "@/integrations/supabase/categories";
import type { Category } from "@/integrations/supabase/categories";
import { useLanguage } from "@/contexts/LanguageContext";
import MaxWidthWrapper from "../MaxWidthWrapper";

interface CollectionProps {}

const Collection: FC<CollectionProps> = ({}) => {
  const { t } = useLanguage();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [chevAppear, setChevApp] = useState<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  });
  const sliderRef: RefObject<HTMLDivElement | null> = useRef(null);

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        // Fetching only the first 8 categories for the landing page
        const { data } = await fetchCategories({ page: 1, limit: 20 });
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleSliderScroll = () => {
    const slider = sliderRef.current;
    if (!slider) return;

    const scrollWidth = slider.scrollLeft + slider.offsetWidth;
    const isLeft = slider.scrollLeft > 2;
    const isRight = scrollWidth < slider.scrollWidth - 2; // Added a small buffer

    setChevApp({ left: isLeft, right: isRight });
  };

  const handleLeftChevClick = () => {
    const slider = sliderRef.current;
    if (slider) slider.scrollLeft -= 320; // Card width (w-80 = 320px) + gap
  };

  const handleRightChevClick = () => {
    const slider = sliderRef.current;
    if (slider) slider.scrollLeft += 320;
  };

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || loading) return;

    const checkChevrons = () => {
      if (slider.scrollWidth > slider.offsetWidth) {
        handleSliderScroll();
      } else {
        setChevApp({ left: false, right: false });
      }
    };

    // Initial check
    checkChevrons();

    // Check on window resize
    window.addEventListener("resize", checkChevrons);

    return () => window.removeEventListener("resize", checkChevrons);
  }, [loading, categories]);

  return (
    <MaxWidthWrapper size={"lg"} className="">
      <div className="my-10 relative">
        <h1 className="lg:text-4xl md:text-2xl text-xl font-bold text-neutral-900 mb-5">
          {t("home.categories")}
        </h1>
        <div
          className="flex overflow-x-scroll scroll-smooth gap-2 md:gap-3 scrollbar-hidden"
          ref={sliderRef}
          onScroll={handleSliderScroll}
        >
          {loading
            ? Array(8)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="w-56 md:w-60 h-60 shrink-0 aspect-[9/12] bg-gray-200 rounded-2xl animate-pulse"
                  />
                ))
            : categories.map((category) => (
                // <Link
                //   href={`/products?categories=${category.id}`}
                //   key={category.id}
                //   className="w-60 h-60 shrink-0 aspect-[9/12] border-2 border-blue-100 rounded-lg overflow-hidden group flex flex-col items-center justify-around gap-2"
                // >
                <Link
                  href={`/products?categories=${category.id}`}
                  key={category.id}
                  className="w-60 h-60 border-2 border-blue-100 rounded-lg aspect-[9/10] shrink-0 flex flex-col items-center group"
                >
                  {/* <Image
                    src={category.icon_url || "/placeholder.svg"}
                    alt={category.name}
                    width={150}
                    height={150}
                    className="group-hover:scale-105 transition-transform duration-300 w-[50%]"
                  /> */}
                  <Image
                    src={category.icon_url || "/placeholder.svg"}
                    alt={category.name}
                    width={150}
                    height={150}
                    className="m-auto group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* <div className="relative w-full z-10 h-full flex flex-col justify-end text-gray-700 md:px-5 px-1 text-center md:text-left pb-2"> */}
                  {/* <h4 className="text-lg font-semibold truncate w-[50%]">
                    {category.name}
                  </h4> */}
                  <h4 className="mb-2 group-hover:text-gray-800">
                    {category.name}
                  </h4>
                  {/* <div className="hidden md:flex items-center justify-between mt-1">
                      <p className="text-sm opacity-80">
                        Check out all our products
                      </p>
                      <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </div> */}
                  {/* </div> */}
                </Link>
              ))}
        </div>

        {!loading && (
          <div className="absolute inset-x-3 xs:inset-x-5 sm:inset-x-10 lg:inset-x-20 z-20 flex items-center justify-between top-1/2 -translate-y-1/2 pointer-events-none">
            <button
              onClick={handleLeftChevClick}
              title="Scroll left"
              aria-label="Scroll left"
              className={cn(
                "text-black bg-white/80 backdrop-blur-sm border border-neutral-300 transition-all duration-300 rounded-full p-2 cursor-pointer pointer-events-auto",
                {
                  "opacity-0 scale-50": !chevAppear.left,
                  "opacity-100 scale-100 hover:bg-white": chevAppear.left,
                }
              )}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleRightChevClick}
              title="Scroll right"
              aria-label="Scroll right"
              className={cn(
                "text-black bg-white/80 backdrop-blur-sm border border-neutral-300 transition-all duration-300 rounded-full p-2 cursor-pointer pointer-events-auto",
                {
                  "opacity-0 scale-50": !chevAppear.right,
                  "opacity-100 scale-100 hover:bg-white": chevAppear.right,
                }
              )}
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </div>
    </MaxWidthWrapper>
  );
};

export default Collection;

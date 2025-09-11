'use client'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { ChevronLeft, ChevronRight, Eye, Star } from 'lucide-react'
import Image from 'next/image'
import { FC, useState, useEffect } from 'react'
import MaxWidthWrapper from '../MaxWidthWrapper'
import { Button } from '../ui/button'
import { useMediaQuery } from "@/hooks/user-media-query"
import { fetchProductsUnder15k, fetchStoreCategories } from "@/integrations/supabase/store"
import type { StoreProduct, StoreCategorySimple } from "@/integrations/supabase/store"
import Link from "next/link"

interface FeaturedProductsProps {}

const promos = ["5% ON NEW PRODUCTS", "5% ON NEW PRODUCTS", "5% ON NEW PRODUCTS", "5% ON NEW PRODUCTS"]

const FeaturedProducts: FC<FeaturedProductsProps> = ({ }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [categories, setCategories] = useState<StoreCategorySimple[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const BUTTON_SIZE = useMediaQuery("(min-width: 768px)") ? 'lg' : 'sm';

  useEffect(() => {
    const loadInitialData = async () => {
        setLoading(true);
        setLoadingFilters(true);
        try {
            const [cats, prods] = await Promise.all([
                fetchStoreCategories(),
                fetchProductsUnder15k()
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
            const prods = await fetchProductsUnder15k(selectedCategoryId === 'all' ? undefined : selectedCategoryId);
            setProducts(prods);
        } catch (error) {
            console.error("Failed to filter products:", error);
        } finally {
            setLoading(false);
        }
    };
    
    loadFilteredProducts();

  }, [selectedCategoryId, loadingFilters]);


  return <MaxWidthWrapper size={'lg'} className='my-20'>
    <h3 className='text-4xl font-bold text-neutral-900 mb-5'>Products under <span className='text-brand-orange'>RWF 15,000</span></h3>
    <div className="flex items-center flex-wrap gap-3 mb-8">
        <Button size={BUTTON_SIZE} className='rounded-full' variant={selectedCategoryId === 'all' ? "default" : "secondary"} onClick={() => setSelectedCategoryId('all')}>All</Button>
      {categories.map((cat) => <Button size={BUTTON_SIZE} className='rounded-full' key={cat.id} variant={selectedCategoryId === cat.id ? "default" : "secondary"} onClick={() => setSelectedCategoryId(cat.id)}>{cat.name}</Button>)}
    </div>

    <Carousel
      opts={{ align: "start", loop: true }}
      className="w-full mt-12 sm:mt-0"
    >
      <CarouselContent>
        {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
                <CarouselItem key={index} className="sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <div className='shrink-0 group aspect-[9/12] bg-gray-200 rounded-2xl animate-pulse' />
                </CarouselItem>
            ))
        ) : products.length > 0 ? (
            products.map((product) => (
                <CarouselItem key={product.id} className="sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <div className='shrink-0 group aspect-[9/12] bg-blue-100 rounded-2xl overflow-hidden relative'>
                    <Image src={product.main_image_url || '/placeholder.svg'} alt={product.name} fill className='absolute object-cover z-0 group-hover:scale-105 transition-transform' />
                    <div className="relative w-full z-10 text-lg h-full flex flex-col justify-between px-3 py-4 bg-gradient-to-t from-black/60 to-transparent">
                        <div className="w-full flex items-center justify-between">
                        <p className="px-4 py-1 text-white bg-red-500 rounded-full text-sm">Hot</p>
                        {(product?.average_rating || null) && <p className="px-2 py-1 bg-white rounded-full flex items-center gap-1"><Star fill='#eab308' size={14} className='text-warning' /> <span className='font-mono text-sm'>{product?.average_rating?.toFixed(1)}</span></p>}
                        </div>
                        <div>
                        <h4 className='font-light text-white'>{product.brand || 'New Arrival'}</h4>
                        <div className="flex items-center justify-between text-white">
                            <p className='font-semibold truncate'>{product.name}</p> <span className='font-mono text-base'>RWF {product.price.toLocaleString()}</span>
                        </div>
                        </div>
                    </div>
                    <div className="z-20 absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100 bg-black/40 flex items-center justify-center">
                        <Link href={`/products/${product.id}`}>
                            <Button variant={'secondary'} className='hover:bg-white rounded-full h-14 w-14 p-1'><Eye /></Button>
                        </Link>
                    </div>
                    </div>
                </CarouselItem>
            ))
        ) : (
            <div className="w-full text-center py-10 col-span-full">
                <p>No products found in this category.</p>
            </div>
        )}
      </CarouselContent>
      <CarouselPrevious Icon={ChevronLeft} className='-top-7 sm:-top-12 right-10 left-auto' />
      <CarouselNext Icon={ChevronRight} className='-top-7 sm:-top-12 left-auto right-0' />
    </Carousel>

    <div className="bg-brand-orange mt-10 sm:mt-20 mb-16 sm:mb-24 text-white rounded-xl py-2 overflow-hidden">
      <div className="flex items-center">
        {promos.map((promo, i) => (
          <p key={`promo1-${i}`} className="shrink-0 pl-5 whitespace-nowrap animate-marquee">
            {promo}
          </p>
        ))}
        {promos.map((promo, i) => (
          <p key={`promo2-${i}`} className="shrink-0 pl-5 whitespace-nowrap animate-marquee" style={{ animationDelay: "15s" }}>
            {promo}
          </p>
        ))}
      </div>
    </div>
  </MaxWidthWrapper>
}

export default FeaturedProducts;
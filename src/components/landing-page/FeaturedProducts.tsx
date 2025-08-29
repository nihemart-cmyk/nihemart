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
import { FC, useState } from 'react'
import MaxWidthWrapper from '../MaxWidthWrapper'
import { Button } from '../ui/button'
import { useMediaQuery } from "@/hooks/user-media-query"


interface FeaturedProductsProps {

}

const categories = ["Headphones", "Speakers", "Phones", "Accesories"]
const promos = ["5% ON NEW PRODUCTS", "5% ON NEW PRODUCTS", "5% ON NEW PRODUCTS", "5% ON NEW PRODUCTS"]

const FeaturedProducts: FC<FeaturedProductsProps> = ({ }) => {
  const [category, setCategory] = useState<string>(categories[0])
  const BUTTON_SIZE = useMediaQuery("(min-width: 768px)") ? 'lg' : 'sm'
  return <MaxWidthWrapper size={'lg'} className='my-20'>
    <h3 className='text-4xl font-bold text-neutral-900 mb-5'>Products under <span className='text-brand-orange'>RWF 15,000</span></h3>
    <div className="flex items-center flex-wrap gap-3 mb-8">
      {categories.map((cat, index) => <Button size={BUTTON_SIZE} className='rounded-full' key={index} variant={category == cat ? "default" : "secondary"} onClick={() => setCategory(categories[index])}>{cat}</Button>)}
    </div>

    <Carousel
      opts={{
        align: "center",
      }}
      className="w-full mt-12 sm:mt-0"
    >
      <CarouselContent>
        {Array.from({ length: 8 }).map((_, index) => (
          <CarouselItem key={index} className="sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
            <div className='shrink-0 group aspect-[9/12] bg-blue-100 rounded-2xl overflow-hidden relative' key={index}>
              <Image src='/product2.png' alt='product' fill className='absolute object-cover z-0' />
              <div className="relative w-full z-10 text-lg h-full flex flex-col justify-between px-3 py-4">
                <div className="w-full flex items-center justify-between">
                  <p className="px-4 py-1 text-white bg-red-500 rounded-full text-sm">Hot</p>
                  <p className="px-2 py-1 bg-white rounded-full flex items-center gap-1"><Star fill='#eab308' size={14} className='text-warning' /> <span className='font-mono text-sm'>5.0</span></p>
                </div>
                <div>
                  <h4 className=''>Nova</h4>
                  <div className="flex items-center justify-between">
                    <p className='font-semibold'>Eco Tunes</p> <span className='font-mono'>RWF 15,000</span>
                  </div>
                  <div className="w-8 h-8 shadow-sm bg-teal-600 rounded-full mt-2"></div>
                </div>
              </div>
              <div className="z-20 absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100 bg-black/20 flex items-center justify-center">
                <Button variant={'secondary'} className='hover:bg-white rounded-full h-14 w-14 p-1'><Eye /></Button>
              </div>
            </div>
          </CarouselItem>
        ))}
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

export default FeaturedProducts
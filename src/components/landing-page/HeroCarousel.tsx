'use client'

import { slideImg1 } from "@/assets"
import {
    Carousel,
    CarouselContent,
    CarouselDots,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"
import Autoplay from 'embla-carousel-autoplay'
import Image from "next/image"
import { Button } from "../ui/button"


export default function HeroCarousel() {
    return (
        <div className="relative">
            <Carousel opts={{ loop: true }} plugins={[Autoplay()]}>
                <CarouselContent>
                    {Array.from({ length: 5 }).map((_, index) => (
                        <CarouselItem key={index} className="md:basis-[90%]">
                            <div className="relative h-[80vh] rounded-2xl overflow-hidden">
                                <Image className="w-full h-full object-cover absolute inset-0 z-0" alt="image" priority src={slideImg1} height={500} width={980} />
                                <div className="relative h-full z-10 bg-gradient-to-t from-[#36A9EC] from-0% to-70% flex flex-col">
                                    <div className="mt-auto mb-36 px-20 flex justify-between items-center">
                                        <div className="flex flex-col gap-4">
                                            <h3 className="mt-auto text-7xl text-white font-semibold">Headphones</h3>
                                            <p className="text-white text-lg">Hear the future, save the planet.</p>
                                        </div>
                                        <Button className="bg-brand-orange text-white hover:bg-brand-orange/90 rounded-full" size={'lg'}>Shop headphones</Button>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselNext className="top-[90%] bottom-0 left-[90%] bg-transparent text-white hover:text-[#36A9EC]" />
                <CarouselPrevious className="top-[90%] z-50 left-[10%] bg-transparent text-white hover:text-[#36A9EC]" />
                <CarouselDots />
            </Carousel>
        </div>
    )
}

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
                        <CarouselItem key={index} className="basis-[97%] sm:basis-[90%]">
                            <div className="relative h-[60vh] sm:h-[80vh] rounded-2xl overflow-hidden">
                                <Image className="w-full h-full object-cover absolute inset-0 z-0" alt="image" priority src={slideImg1} height={500} width={980} />
                                <div className="relative h-full z-10 bg-gradient-to-t from-[#36A9EC] from-0% to-70% flex flex-col">
                                    <div className="mt-auto mb-36 px-10 sm:px-20 flex flex-col md:flex-row justify-between md:items-center gap-6 md:gap-5">
                                        <div className="flex flex-col xs:gap-2 md:gap-4">
                                            <h3 className="mt-auto text-3xl xs:text-5xl sm:text-6xl lg:text-7xl text-white font-semibold">Headphones</h3>
                                            <p className="text-white text-base xs:text-lg">Hear the future, save the planet.</p>
                                        </div>
                                        <Button className="bg-brand-orange text-white hover:bg-brand-orange/90 rounded-full w-full md:w-fit" size={'lg'}>Shop headphones</Button>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselNext className="top-[90%] bottom-0 left-[85%] md:left-[90%] bg-transparent text-white hover:text-[#36A9EC]" />
                <CarouselPrevious className="top-[90%] z-50 left-[10%] bg-transparent text-white hover:text-[#36A9EC]" />
                <CarouselDots />
            </Carousel>
        </div>
    )
}

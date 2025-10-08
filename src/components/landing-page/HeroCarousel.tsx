"use client";

import {
  carousel1,
  carousel2,
  carousel3,
  carousel4,
  carousel5,
} from "@/assets";
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import Image from "next/image";
import { Button } from "../ui/button";
import MaxWidthWrapper from "../MaxWidthWrapper";
import Link from "next/link";

const carouselContent = [
  {
    image: carousel1,
    heading: "Rare Products",
    description:
      "Products you can't find in Rwanda now delivered to you in 40 minutes.",
    buttonText: "Start Shopping now!",
  },
  {
    image: carousel2,
    heading: "Easy Delivery",
    description:
      "If you are in province don't worry we deliver every one deserve access to our rare products",
    buttonText: "Place your order now!",
  },
  {
    image: carousel3,
    heading: "Buy Now, Pay Later",
    description: "You like it, we bring it, you pay later.",
    buttonText: "Shop now",
  },
  {
    image: carousel4,
    heading: "Gifts & More",
    description:
      "Buy gifts home appliances, kids products, watches, necklaces, etc",
    buttonText: "Explore gifts",
  },
  {
    image: carousel5,
    heading: "Low Prices",
    description: "Yes we know, our prices are low.",
    buttonText: "Browse products",
  },
];

export default function HeroCarousel() {
  return (
    <MaxWidthWrapper size={"lg"} className="lg:mt-10 my-3">
      <div className="relative">
        <Carousel opts={{ loop: true }} plugins={[Autoplay()]}>
          <CarouselContent className="mb-3">
            {carouselContent.map((slide, index) => (
              <CarouselItem key={index} className="basis-[100%] sm:basis-[90%]">
                <div className="relative h-[60vh] sm:h-[70vh] md:h-[80vh] lg:h-[90vh] rounded-2xl overflow-hidden">
                  <Image
                    className="w-full h-full object-cover absolute inset-0 z-0"
                    alt="image"
                    priority
                    src={slide.image}
                    height={500}
                    width={980}
                  />
                  <div className="relative h-full z-10 bg-gradient-to-t from-[#36A9EC] to-transparent flex flex-col p-4 md:p-10">
                    <div className="mt-auto mb-12 sm:mb-20 px-5 sm:px-10 md:px-20 flex flex-col md:flex-row justify-between md:items-center gap-6 md:gap-10">
                      <div className="flex flex-col gap-3 md:gap-4">
                        <h3 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white font-semibold">
                          {slide.heading}
                        </h3>
                        <p className="text-white text-sm sm:text-lg md:text-xl">
                          {slide.description}
                        </p>
                      </div>
                      <Link href="/products">
                        <Button
                          className="bg-brand-orange text-white hover:bg-brand-orange/90 rounded-full w-full sm:w-fit"
                          size="lg"
                        >
                          {slide.buttonText}
                        </Button>
                      </Link>
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
    </MaxWidthWrapper>
  );
}
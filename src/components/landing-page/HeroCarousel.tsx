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
      "Products you can't find in Rwanda now delivered to you in 40 minutes.",
    buttonText: "Start Shopping now!",
  },
  {
    image: carousel2,
    heading: "Easy Delivery",
    description:
      "If you are in province don't worry we deliver every one deserve access to our rare products",
    buttonText: "Place your order now!",
  },
  {
    image: carousel3,
    heading: "Buy Now, Pay Later",
    description: "You like it, we bring it, you pay later.",
    buttonText: "Shop now",
  },
  {
    image: carousel4,
    heading: "Gifts & More",
    description:
      "Buy gifts home appliances, kids products, watches , necklaces, etc",
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
    <MaxWidthWrapper size={"lg"} className="my-20">
      <div className="relative">
        <Carousel opts={{ loop: true }} plugins={[Autoplay()]}>
          <CarouselContent>
            {carouselContent.map((slide, index) => (
              <CarouselItem key={index} className="basis-[97%] sm:basis-[90%]">
                <div className="relative h-[60vh] sm:h-[80vh] rounded-2xl overflow-hidden">
                  <Image
                    className="w-full h-full object-cover absolute inset-0 z-0"
                    alt={slide.heading}
                    priority={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
                    src={slide.image}
                    height={800}
                    width={1200}
                    quality={85}
                    placeholder="blur"
                    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+IRjWjBqO6O2mhP//Z"
                  />
                  <div className="relative h-full z-10 bg-gradient-to-t from-[#36A9EC] from-0% to-70% flex flex-col">
                    <div className="mt-auto mb-36 px-10 sm:px-20 flex flex-col md:flex-row justify-between md:items-center gap-6 md:gap-5">
                      <div className="flex flex-col xs:gap-2 md:gap-4">
                        <h3 className="mt-auto text-3xl xs:text-5xl sm:text-6xl lg:text-7xl text-white font-semibold">
                          {slide.heading}
                        </h3>
                        <p className="text-white text-base xs:text-lg">
                          {slide.description}
                        </p>
                      </div>
                      <Link href="/products">
                        <Button
                          className="bg-brand-orange text-white hover:bg-brand-orange/90 rounded-full w-full md:w-fit"
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

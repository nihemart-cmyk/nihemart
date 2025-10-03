"use client";

import { carousel1, carousel2, carousel3, carousel4 } from "@/assets";
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

const carouselContent = [
  {
    image: carousel1,
    heading: "Headphones",
    description: "Products you can't find anywhere else in Rwanda now delivered to you in 40 minutes.",
    buttonText: "Shop headphones",
  },
  {
    image: carousel2,
    heading: "Easy access",
    description: "Not in Kigali? It's okay, we deliver",
    buttonText: "Shop speakers",
  },
  {
    image: carousel3,
    heading: "Pay later",
    description: "You like it? We bring it to you.",
    buttonText: "Shop earbuds",
  },
  {
    image: carousel4,
    heading: "Accessories",
    description: "Yes we know, our prices are low.",
    buttonText: "Shop accessories",
  },
  {
    image: carousel2,
    heading: "Bundles",
    description: "Buy gifts, home appliances, kids products, watches, necklaces, etc with us.",
    buttonText: "Shop bundles",
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
                    alt="image"
                    priority
                    src={slide.image}
                    height={500}
                    width={980}
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
                      <Button
                        className="bg-brand-orange text-white hover:bg-brand-orange/90 rounded-full w-full md:w-fit"
                        size={"lg"}
                      >
                        {slide.buttonText}
                      </Button>
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

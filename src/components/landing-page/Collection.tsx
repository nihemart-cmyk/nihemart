'use client'
import { cn } from '@/lib/utils';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { FC, RefObject, useEffect, useRef, useState } from 'react';

interface CollectionProps {

}

// const products = 

const Collection: FC<CollectionProps> = ({ }) => {
    const [chevAppear, setChevApp] = useState<{left: boolean, right: boolean}>({ left: false, right: false });
    const [winObje, setWindow] = useState({});
    const sliderRef: RefObject<HTMLDivElement | null> = useRef(null);

    const handleSliderScroll = () => {
        const slider = sliderRef.current;
        const scrollWidth = slider!.scrollLeft + slider!.offsetWidth;
        const isLeft = slider!.scrollLeft > 2;
        const isRight = scrollWidth + 15 <= slider!.scrollWidth;

        if (isLeft) {
            if (isRight && isRight) {
                setChevApp({ right: true, left: true });
            } else {
                setChevApp({ right: false, left: true });
            }
        } else {
            setChevApp({ right: true, left: false });
        }
    };
    const handleLeftChevClick = () => {
        const slider = sliderRef.current;
        slider!.scrollLeft -= 305;
    };
    const handleRightChevClick = () => {
        const slider = sliderRef.current;
        slider!.scrollLeft += 305;
    };

    useEffect(() => {
        if (typeof window !== undefined) setWindow(window);
        const slider = sliderRef.current;
        if (slider!.scrollWidth > slider!.offsetWidth) {
            setChevApp({ left: false, right: true });
        }

        window.addEventListener("resize", () => {
            if (slider!.scrollWidth > slider!.offsetWidth)
                setChevApp({ left: false, right: true });
            else setChevApp({ left: false, right: false });
        });
    }, [winObje]);
    return <div className='my-10 relative'>
        <div className="flex overflow-x-scroll scroll-smooth gap-5 pl-20 scrollbar-hidden" ref={sliderRef}
            onScroll={handleSliderScroll}>
            {Array(8).fill(3).map((_, i) => <div className='w-80 shrink-0 aspect-[9/12] bg-blue-100 rounded-2xl overflow-hidden relative' key={i}>
                <Image src='/product.png' alt='product' fill className='absolute object-cover z-0' />
                <div className="relative w-full z-10 h-full bg-gradient-to-t from-black from-0% to-70% flex flex-col justify-end text-white px-3 pb-4">
                    <h4 className='font-semibold'>All products</h4>
                    <div className="flex items-center justify-between">
                        <p className='text-sm'>Check out all our products</p> <ArrowRight />
                    </div>
                </div>
            </div>)}
        </div>
        <div className="absolute inset-x-20 z-50 flex items-center justify-between top-1/2 -translate-y-1/2">
            <ChevronLeft
                onClick={handleLeftChevClick}
                size={40}
                className={cn('text-3xl text-black bg-white border transition-colors duration-300 rounded-full p-2 cursor-pointer opacity-1', { "opacity-0": !chevAppear.left })}
            />

            <ChevronRight
                onClick={handleRightChevClick}
                size={40}
                className={cn('text-3xl p-2 text-black bg-white border transition-colors duration-300 rounded-full cursor-pointer opacity-1', { "opacity-0": !chevAppear.right })}
            /></div>
    </div>
}

export default Collection
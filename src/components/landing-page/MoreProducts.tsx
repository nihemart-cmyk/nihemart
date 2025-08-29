'use client'
import { FC, useState } from 'react'
import MaxWidthWrapper from '../MaxWidthWrapper'
import { Button, buttonVariants } from '../ui/button'
import Image from 'next/image'
import { Eye, Star } from 'lucide-react'
import MarqueeBanner from './MarqueeBanner'
import { Icons } from '../icons'
import { useMediaQuery } from '@/hooks/user-media-query'

interface MoreProductsProps {

}
const categories = ["Headphones", "Speakers", "Phones", "Accesories"]
const promos = ["5% ON NEW PRODUCTS", "5% ON NEW PRODUCTS", "5% ON NEW PRODUCTS", "5% ON NEW PRODUCTS"]
const services = [
    {
        label: "Customer service",
        Icon: Icons.landingPage.headSets,
    },
    {
        label: "Fast free shipping",
        Icon: Icons.landingPage.ship,
    },
    {
        label: "Refer a friend",
        Icon: Icons.landingPage.friends,
    },
    {
        label: "Secure payment",
        Icon: Icons.landingPage.verified,
    },
]
const MoreProducts: FC<MoreProductsProps> = ({ }) => {
    const [category, setCategory] = useState<string>(categories[0])
    const ButtonSize = useMediaQuery("(min-width: 768px)") ? 'lg' : 'sm'
    return <div>
        <MaxWidthWrapper size={'lg'} className=''>
            <h3 className='text-4xl font-bold text-neutral-900 mb-5'>More to Love</h3>
            <div className="flex items-center flex-wrap gap-3 mb-8">
                {categories.map((cat, index) => <Button size={ButtonSize} className='rounded-full' key={index} variant={category == cat ? "default" : "secondary"} onClick={() => setCategory(categories[index])}>{cat}</Button>)}
            </div>
            <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[1000px]:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 12 }).map((_, index) => <div className='shrink-0 group aspect-[9/12] bg-blue-100 rounded-2xl overflow-hidden relative' key={index}>
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
                            <div className=" w-5 h-5 sm:w-8 sm:h-8 shadow-sm bg-teal-600 rounded-full mt-2"></div>
                        </div>
                    </div>
                    <div className="z-20 absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100 bg-black/20 flex items-center justify-center">
                        <Button variant={'secondary'} className='hover:bg-white rounded-full h-14 w-14 p-1'><Eye /></Button>
                    </div>
                </div>)}
            </div>
            <div className="bg-brand-blue w-full my-20 text-white rounded-xl px-20 py-2 flex items-center justify-between gap-5 overflow-hidden">
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
            <div className="grid grid-cols-1 min-[500px]:grid-cols-2 min-[1000px]:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, index) => <div className='shrink-0 group aspect-[9/12] bg-blue-100 rounded-2xl overflow-hidden relative' key={index}>
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
                            <div className=" w-5 h-5 sm:w-8 sm:h-8 shadow-sm bg-teal-600 rounded-full mt-2"></div>
                        </div>
                    </div>
                    <div className="z-20 absolute inset-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100 bg-black/20 flex items-center justify-center">
                        <Button variant={'secondary'} className='hover:bg-white rounded-full h-14 w-14 p-1'><Eye /></Button>
                    </div>
                </div>)}
            </div>
        </MaxWidthWrapper>
        <MarqueeBanner />
        <MaxWidthWrapper size={'lg'} className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
            {services.map(({ label, Icon }, i) => <div key={i} className='flex flex-col items-center'>
                <Icon />
                <p className='font-semibold'>{label}</p>
            </div>)}
        </MaxWidthWrapper>
    </div>
}

export default MoreProducts
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { FC } from 'react'
import { Icons } from '../icons'
import MaxWidthWrapper from '../MaxWidthWrapper'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface FooterProps {

}

const Footer: FC<FooterProps> = ({ }) => {
    return <div className='bg-black text-white'>
        <MaxWidthWrapper size={'lg'} className='divide-x divide-slate-800 grid grid-cols-2 min-h-96'>
            <div className="flex flex-col pt-20 pb-5">
                <div className="space-y-6">
                    <h5 className='text-xl font-semibold'>Subscribe to our newsletter</h5>
                    <div className="flex items-center gap-2 max-w-sm">
                        <Input placeholder='Enter your email' className='bg-slate-900 border-slate-800 h-12 placeholder:text-xl md:text-lg' />
                        <Button variant={'secondary'} className='h-12'><ArrowRight /></Button>
                    </div>
                </div>
                <p className="mt-auto">©2025 Nihemart - Online Store</p>
            </div>
            <div className="flex flex-col justify-between pt-20 pb-5 pl-20">
                <div className="flex justify-between">
                    <div className="flex flex-col gap-3 font-bold text-3xl">
                        <Link href={'#'} className='hover:text-slate-500 transition-colors'>About</Link>
                        <Link href={'#'} className='hover:text-slate-500 transition-colors'>Journal</Link>
                        <Link href={'#'} className='hover:text-slate-500 transition-colors'>FAQs</Link>
                        <Link href={'#'} className='hover:text-slate-500 transition-colors'>Contact us</Link>
                    </div>
                    <div className="flex flex-col gap-2 text-slate-500 text-base">
                        <Link href={'#'} className='hover:text-slate-200 transition-colors'>Headphones</Link>
                        <Link href={'#'} className='hover:text-slate-200 transition-colors'>Speakers</Link>
                        <Link href={'#'} className='hover:text-slate-200 transition-colors'>Charging stations</Link>
                        <Link href={'#'} className='hover:text-slate-200 transition-colors'>Phones</Link>
                        <Link href={'#'} className='hover:text-slate-200 transition-colors'>Portable charger</Link>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <p>Privacy Policy</p>
                    <div className="flex items-center gap-1">
                        <Link href={"#"}>
                            <Icons.landingPage.instagram className='h-8 w-8' />
                        </Link>
                        <Link href={"#"}>
                            <Icons.landingPage.facebook className='h-8 w-8' />
                        </Link>
                        <Link href={"#"}>
                        </Link>
                        <Link href={"#"}>
                            <Icons.landingPage.tiktok className='h-8 w-8' />
                        </Link>
                        <Link href={"#"}>
                            <Icons.landingPage.youtube className='h-8 w-8' />
                        </Link>
                    </div>
                </div>
            </div>
        </MaxWidthWrapper>
    </div>
}

export default Footer
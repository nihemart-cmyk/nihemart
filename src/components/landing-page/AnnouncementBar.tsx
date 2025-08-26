import { BadgePercent } from 'lucide-react'
import Link from 'next/link'
import { FC } from 'react'
import MaxWidthWrapper from '../MaxWidthWrapper'
import { Icons } from '../icons'

interface AnnouncementBarProps {

}

const AnnouncementBar: FC<AnnouncementBarProps> = ({ }) => {
    return <div className='w-full bg-brand-orange text-white py-2'>
        <MaxWidthWrapper size={'lg'} className='flex items-center justify-between'>
            <div className="flex items-center gap-3">
                <BadgePercent size={30} />
                <p className='font-semibold'>Due to Rainy season it will affect delivery  </p>
            </div>
            <div className="flex items-center gap-1">
                <Link href={"#"}>
                    <Icons.landingPage.instagram className='h-6 w-6' />
                </Link>
                <Link href={"#"}>
                    <Icons.landingPage.facebook className='h-6 w-6' />
                </Link>
                <Link href={"#"}>
                </Link>
                <Link href={"#"}>
                    <Icons.landingPage.tiktok className='h-6 w-6' />
                </Link>
                <Link href={"#"}>
                    <Icons.landingPage.youtube className='h-6 w-6' />
                </Link>
            </div>
        </MaxWidthWrapper>
    </div>
}

export default AnnouncementBar
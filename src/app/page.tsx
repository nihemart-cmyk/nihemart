import AnnouncementBar from '@/components/landing-page/AnnouncementBar'
import Collection from '@/components/landing-page/Collection'
import FeaturedProducts from '@/components/landing-page/FeaturedProducts'
import Footer from '@/components/landing-page/Footer'
import HeroCarousel from '@/components/landing-page/HeroCarousel'
import MoreProducts from '@/components/landing-page/MoreProducts'
import MoreToLove from '@/components/landing-page/MoreToLove'
import NavBar from '@/components/landing-page/NavBar'
import { FC } from 'react'

interface pageProps {
  
}

const page: FC<pageProps> = ({}) => {
  return <div className='w-full'>
    <AnnouncementBar />
    <NavBar />
    <HeroCarousel />
    <Collection />
    <FeaturedProducts />
    <MoreProducts />
    <MoreToLove />
    <Footer />
  </div>
}

export default page
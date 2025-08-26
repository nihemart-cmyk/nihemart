import Image from 'next/image'
import { FC } from 'react'
import logo from '@/assets/logo.png';
import MaxWidthWrapper from '../MaxWidthWrapper';
import { cn } from '@/lib/utils';
import { Icons } from '../icons';
import { Search, ShoppingCart, UserRound } from 'lucide-react';
import { Button } from '../ui/button';

interface NavBarProps {

}

export const routes = [
    { name: 'Home', url: '#' },
    { name: 'Products', url: '#' },
    { name: 'Service', url: '#' },
    { name: 'How to buy', url: '#' },
] as const;


const NavBar: FC<NavBarProps> = ({ }) => {
    return <div className='sticky top-0 w-full z-[9999] bg-white'>
        <MaxWidthWrapper size={'lg'} className="w-full flex items-center justify-between py-6">
            <Image src={logo} alt="ilead logo" priority height={50} width={200} />

            <div className="flex items-center gap-3">
                {routes.map(({ url, name }, i) => (
                    <a
                        key={i}
                        href={url}
                        className={cn(
                            'relative text-slate-500 font-semibold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-brand-orange after:transition-transform after:duration-300 hover:after:origin-bottom-left hover:after:scale-x-100'
                        )}
                    >
                        {name}
                    </a>
                ))}
            </div>

            <div className="flex items-center gap-3">
                <Button variant={'ghost'}>
                    <Icons.landingPage.translate />
                </Button>
                <Button variant={'ghost'}>
                    <Search />
                </Button>
                <Button variant={'ghost'}>
                    <UserRound />
                </Button>
                <Button variant={'ghost'}>
                    <ShoppingCart />
                </Button>
            </div>
        </MaxWidthWrapper>
    </div>
}

export default NavBar
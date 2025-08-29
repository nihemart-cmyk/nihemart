import Image from 'next/image'
import { FC } from 'react'
import logo from '@/assets/logo.png';
import MaxWidthWrapper from '../MaxWidthWrapper';
import { cn } from '@/lib/utils';
import { Icons } from '../icons';
import { Menu, Search, ShoppingCart, UserRound } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '../ui/dropdown-menu';
import Link from 'next/link';

interface NavBarProps {

}

export const routes = [
    { name: 'Home', url: '#' },
    { name: 'Products', url: '#' },
    { name: 'Service', url: '#' },
    { name: 'How to buy', url: '#' },
] as const;


const NavBar: FC<NavBarProps> = ({ }) => {
    return <div className='sticky top-0 w-full z-[999] bg-white'>
        <MaxWidthWrapper size={'lg'} className="w-full flex items-center justify-between py-6">
            <Image src={logo} alt="ilead logo" priority height={50} width={200} className='w-32 sm:w-40 object-contain' />

            <div className="hidden lg:flex items-center gap-4">
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

            <div className="flex items-center">
                <Button variant={'ghost'} className='px-1 sm:px-3'>
                    <Icons.landingPage.translate />
                </Button>
                <Button variant={'ghost'} className='px-1 sm:px-3'>
                    <Search />
                </Button>
                <Button variant={'ghost'} className='px-1 sm:px-3'>
                    <UserRound />
                </Button>
                <Button variant={'ghost'} className='px-1 sm:px-3'>
                    <ShoppingCart />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className='relative px-2 lg:hidden bg-brand-blue hover:bg-brand-blue/90 ml-1'>
                            <Menu />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className='w-56 z-[9999]'
                        align='end'
                        sideOffset={10}
                        forceMount
                    >
                        {routes.map(({ name, url }, index) => <DropdownMenuItem key={index} asChild>
                            <Link href={url}>{name}</Link>
                        </DropdownMenuItem>)}

                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </MaxWidthWrapper>
    </div>
}

export default NavBar
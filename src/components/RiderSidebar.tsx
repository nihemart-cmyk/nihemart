'use client';

import Image from 'next/image';
import { FC, useState, useEffect, ElementType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import logo from '@/assets/logo.png';
import { cn } from '@/lib/utils';
import { Icons } from './icons';
import AnimatedBackground from './ui/animated-bg';
import { ChevronDown, LogOut, Settings } from 'lucide-react';
import { Button } from './ui/button';

interface NavItem {
    id: string;
    title: string;
    icon: ElementType;
    href?: string;
    subLinks?: Omit<NavItem, 'subLinks' | 'icon'>[];
}

type FlatNavItem = {
    item: NavItem | Omit<NavItem, 'subLinks' | 'icon'>;
    parent?: NavItem;
};

const navItems: NavItem[] = [
    { id: '1', title: 'Dashboard', href: '/rider', icon: Icons.sidebar.dashboard },
    { id: '2', title: 'Orders', href: '/rider/orders', icon: Icons.sidebar.orders },
];

const RiderSidebar: FC = () => {
    const router = useRouter();
    const pathname = usePathname();

    const [primaryActiveId, setPrimaryActiveId] = useState<string | null>(null);
    const [secondaryActiveId, setSecondaryActiveId] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    useEffect(() => {
        let bestMatch: FlatNavItem | null = null;
        const allLinks = navItems.flatMap((item): FlatNavItem[] => {
            if (item.subLinks) {
                return item.subLinks.map(sub => ({ item: sub, parent: item }));
            } else {
                return [{ item: item, parent: undefined }];
            }
        });

        allLinks.sort((a, b) => (b.item.href?.length ?? 0) - (a.item.href?.length ?? 0));

        for (const link of allLinks) {
            if (link.item.href && pathname.startsWith(link.item.href)) {
                bestMatch = link;
                break;
            }
        }

        if (bestMatch) {
            if (bestMatch.parent) {
                setPrimaryActiveId(bestMatch.parent.id);
                setSecondaryActiveId(bestMatch.item.id);
                setOpenMenu(bestMatch.parent.id);
            } else {
                setPrimaryActiveId((bestMatch.item as NavItem).id);
                setSecondaryActiveId(null);
                setOpenMenu(null);
            }
        } else if (pathname === '/admin') {
            setPrimaryActiveId('1');
            setSecondaryActiveId(null);
            setOpenMenu(null);
        }
    }, [pathname]);

    const handleParentClick = (item: NavItem) => {
        const isOpening = openMenu !== item.id;
        setOpenMenu(isOpening ? item.id : null);

        if (isOpening && item.subLinks && item.subLinks[0]?.href) {
            router.push(item.subLinks[0].href);
        }
    };

    return (
        <div className='w-full h-full flex flex-col py-10 px-1 lg:px-5'>
            <div className="w-full ml-2 mb-8 flex-shrink-0">
                <Image src={logo} alt="Nihemart logo" priority height={50} width={200} />
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col gap-1">
                    <AnimatedBackground activeId={primaryActiveId}>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isOpen = openMenu === item.id;

                            if (item.subLinks) {
                                return (
                                    <div key={item.id} data-id={item.id} className="flex flex-col">
                                        <button
                                            onClick={() => handleParentClick(item)}
                                            className={cn("px-6 py-2 flex items-center gap-3 w-full justify-start font-medium")}>
                                            <Icon size={20} />
                                            <span>{item.title}</span>
                                            <motion.span className="ml-auto" animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.2 }}>
                                                <ChevronDown size={16} />
                                            </motion.span>
                                        </button>
                                        <AnimatePresence>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                    className="overflow-hidden flex flex-col pl-8 text-sm">
                                                    {item.subLinks.map((subLink) => {
                                                        const isSubLinkActive = secondaryActiveId === subLink.id;
                                                        return (
                                                            <Link
                                                                key={subLink.id}
                                                                href={subLink.href!}
                                                                className={cn(
                                                                    "px-4 py-1 flex items-center gap-3 w-full justify-start text-neutral-600",
                                                                    isSubLinkActive ? "font-bold text-neutral-800" : "font-medium"
                                                                )}>
                                                                <span>{subLink.title}</span>
                                                            </Link>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            }
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href!}
                                    data-id={item.id}
                                    className={cn("w-full")}>
                                    <p className='px-6 py-2 !flex items-center gap-3 w-full justify-start font-medium'>
                                        <Icon size={20} />
                                        <span>{item.title}</span>
                                    </p>
                                </Link>
                            );
                        })}
                    </AnimatedBackground>
                </div>
            </div>

            <div className="pt-4 flex-shrink-0 w-full flex flex-col">
                <Button variant={'ghost'} size={'lg'} className='h-12 flex items-center justify-start text-lg'>
                    <Settings size={20} /> Settings
                </Button>
                <Button variant={'ghost'} size={'lg'} className='h-12 flex items-center justify-start text-lg'>
                    <LogOut size={20} /> Logout
                </Button>
            </div>
        </div>
    );
}

export default RiderSidebar;
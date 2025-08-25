'use client'
import { profilePlaceholder } from '@/assets'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { DropdownMenuGroup } from '@radix-ui/react-dropdown-menu'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next13-progressbar'
import { FC } from 'react'
import { Button } from './ui/button'
import { DropdownMenu } from './ui/dropdown-menu'
import { UserAvatarProfile } from './user-avatar-profile'

interface TopBarProps {
  title: string,
  className?: string
}

const TopBar: FC<TopBarProps> = ({ title, className }) => {
  const router = useRouter()
  return <div className={cn('w-full py-5 px-10 flex items-center justify-between border-b border-b-brand-border', className)}>
    <h3 className='font-bold text-3xl'>{title}</h3>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative'>
          <UserAvatarProfile user={{
            emailAddress: 'fadhili@gmail.com',
            fullName: 'FADHILI Josue',
            imageUrl: profilePlaceholder.src
          }} showInfo />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className='w-56'
        align='end'
        sideOffset={10}
        forceMount
      >
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm leading-none font-medium'>
              FADHILI Josue
            </p>
            <p className='text-muted-foreground text-xs leading-none'>
              fadhili@gmail.com
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <DropdownMenuItem>
            <LogOut size={20} strokeWidth={2} className="opacity-60" aria-hidden="true" /> Logout
          </DropdownMenuItem>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
}

export default TopBar
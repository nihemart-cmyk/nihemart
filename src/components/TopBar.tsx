'use client'
import { profilePlaceholder } from '@/assets'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { DropdownMenuGroup } from '@radix-ui/react-dropdown-menu'
import { Bell, LogOut, SearchIcon } from 'lucide-react'
import { useRouter } from 'next13-progressbar'
import { FC } from 'react'
import { Button } from './ui/button'
import { DropdownMenu } from './ui/dropdown-menu'
import { UserAvatarProfile } from './user-avatar-profile'
import { Input } from './ui/input'
import Link from 'next/link'

type TopBarProps = {
  className?: string
} & ({
  variant: "primary"
  title: string
} | {
  variant: "secondary"
})


const TopBar: FC<TopBarProps> = (props) => {
  const router = useRouter()
  const { className, variant } = props;

  return <div className={cn('w-full py-3 px-10 flex items-center justify-between border-b border-b-brand-border bg-white', { "bg-surface-secondary": variant === 'secondary' }, className)}>
    {variant === 'primary' && <h3 className='font-bold text-3xl w-full'>{props.title}</h3>}

    <div className={cn("flex items-center justify-between gap-6", { "w-full": variant === 'secondary' })}>
      <div className="relative">
        <Input
          className="peer ps-10 border-none shadow-none h-14 min-w-80 md:text-base bg-surface-secondary rounded-full px-4"
          placeholder="Search product, customer, etc..."
          type="search"
        />
        <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
          <SearchIcon size={20} className='text-black' />
        </div>
      </div>
      <div className='flex items-center gap-4'>
        <Link href={"#"} className='border border-border-primary p-2 rounded-full'>
          <Bell className='w-7 h-7' />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='relative h-16'>
              <UserAvatarProfile user={{
                position: 'Admin',
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
                <p className='text-secondary text-xs leading-none'>
                  admin
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
              <LogOut size={20} strokeWidth={2} className="opacity-60 mr-2" aria-hidden="true" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </div>
}

export default TopBar
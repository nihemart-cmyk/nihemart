import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import { ReactNode } from 'react'

interface LayoutProps {
    children: ReactNode,
}

const layout = ({ children }: LayoutProps) => {
    return <div className='w-full h-screen overflow-hidden flex bg-white'>
        <div className="w-80 border-r bg-surface-secondary border-border-primary h-full">
            <Sidebar />
        </div>
        <div className='w-full'>
            <TopBar title='Dashboard' className='bg-surface-secondary' />
            {children}
        </div>
    </div>
}

export default layout
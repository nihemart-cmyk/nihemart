'use client'
import { FC, ReactNode } from 'react'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

interface ProvidersProps {
    children: ReactNode
}

const Providers: FC<ProvidersProps> = ({ children }) => {
    return <>
        <NuqsAdapter>{children}</NuqsAdapter>
    </>
}

export default Providers
import TransactionsMetrics from '@/components/orders/TransactionsMetrics'
import TransactionsTable from '@/components/orders/TransactionsTable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FC } from 'react'

interface pageProps {

}

const page: FC<pageProps> = ({ }) => {
  return <ScrollArea className='bg-surface-secondary h-[calc(100vh-5rem)]'>
    <div className="px-5 sm:px-10 py-10">
      <TransactionsMetrics />
      <TransactionsTable />
    </div>
  </ScrollArea>
}

export default page
import OrdersMetrics from '@/components/orders/TransactionsMetrics'
import OrdersTable from '@/components/orders/TransactionsTable'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CustomerTable } from '@/components/users/customers-table'
import CustomersMetrics from '@/components/users/CustomersMetrics'
import { FC } from 'react'

interface pageProps {

}

const page: FC<pageProps> = ({ }) => {
  return <ScrollArea className='bg-surface-secondary h-[calc(100vh-5rem)]'>
    <div className="flex min-w-0 flex-col px-2 py-10 xs:px-5 sm:px-10">
      <CustomersMetrics />
      <CustomerTable />
    </div>
  </ScrollArea>
}

export default page
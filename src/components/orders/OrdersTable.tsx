"use client";
import { FC, useState } from 'react'
import { DataTable } from './data-table'
import { columns } from './columns'
import { AnimatedBackground } from '../ui/animated-background'
import { Input } from '../ui/input'
import { ArrowUpDown, Download, Ellipsis, ListFilter, SearchIcon, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useOrders } from '@/hooks/useOrders'
import { OrderStatus, Order } from '@/integrations/supabase/products'

interface OrdersTableProps {

}

const statusLabels = ['All', 'Pending', 'Processing', 'Delivered', 'Cancelled'] as const

const OrdersTable: FC<OrdersTableProps> = () => {
  const { useAllOrders } = useOrders()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [page, setPage] = useState(1)
  const limit = 10
  const [sort, setSort] = useState({ column: 'created_at', direction: 'desc' as 'asc' | 'desc' })

  const statusValue = statusFilter !== 'All' ? statusFilter.toLowerCase() as OrderStatus : undefined

  const { data: ordersData, isLoading, isError, error } = useAllOrders({
    filters: {
      search: search || undefined,
      status: statusValue,
    },
    pagination: {
      page,
      limit,
    },
    sort,
  })

  const orders = ordersData?.data || []
  const totalCount = ordersData?.count || 0
  const totalPages = Math.ceil(totalCount / limit)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleStatusChange = (label: typeof statusLabels[number]) => {
    setStatusFilter(label)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  // Simple page range calculation for pagination
  const getPageNumbers = () => {
    const pages = []
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, page + 2)
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  if (isError) {
    return (
      <div className='p-5 rounded-2xl bg-white mt-10'>
        <p className="text-red-500">Error loading orders: {error?.message}</p>
      </div>
    )
  }

  return (
    <div className='p-5 rounded-2xl bg-white mt-10'>
      <div className="flex gap-5 justify-between flex-col 2xl:flex-row pb-8">
        <div className='hidden md:block rounded-[8px] h-fit py-2 px-3 bg-[#E8F6FB] p-[2px] relative'>
          <AnimatedBackground
            defaultValue='All'
            className='rounded-lg bg-white dark:bg-zinc-700'
            transition={{
              ease: 'easeInOut',
              duration: 0.2,
            }}
          >
            {statusLabels.map((label, index) => {
              return (
                <button
                  key={index}
                  data-id={label}
                  type='button'
                  aria-label={`${label} view`}
                  onClick={() => handleStatusChange(label)}
                  className={`inline-flex h-10 px-2 items-center text-zinc-800 transition-transform active:scale-[0.98] ${statusFilter === label ? 'text-red-500' : ''} dark:text-zinc-50 group`}
                >
                  <span className='font-semibold mr-2'>{label}</span>
                  <span className={`text-[#F26823] transition-all ${statusFilter === label ? 'opacity-100' : 'opacity-0'}`}>(240)</span>
                </button>
              );
            })}
          </AnimatedBackground>
        </div>
        <div className="flex gap-2 items-center max-[500px]:flex-wrap">
          <div className="relative max-[500px]:w-full">
            <Input
              className="peer pe-10 border-none shadow-none h-10 sm:h-12 md:min-w-80 md:text-base bg-neutral-100 rounded-xl px-4"
              placeholder="Search product, customer, etc..."
              type="search"
              value={search}
              onChange={handleSearchChange}
            />
            <div className="text-muted-foreground/80 !cursor-pointer absolute inset-y-0 end-0 flex items-center justify-center pe-3 peer-disabled:opacity-50">
              <SearchIcon size={20} className='text-black' />
            </div>
          </div>
          <Button variant={'outline'} className='px-3 h-10 sm:h-12'>
            <ListFilter className='text-neutral-600' />
          </Button>
          <Button variant={'outline'} className='px-3 h-10 sm:h-12'>
            <ArrowUpDown className='text-neutral-600' />
          </Button>
          <Button variant={'outline'} className='px-3 h-10 sm:h-12'>
            <Ellipsis className='text-neutral-600' />
          </Button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-between mb-3">
        <div className="flex flex-col">
          <h3 className='text-text-primary text-xl font-bold'>Order List</h3>
          <p className='text-text-secondary'>Track orders list across your store.</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading orders...</span>
        </div>
      ) : (
        <DataTable columns={columns} data={orders} />
      )}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              href="#" 
              onClick={(e) => { e.preventDefault(); handlePageChange(page - 1); }} 
              className={page === 1 ? 'pointer-events-none opacity-50' : ''} 
            />
          </PaginationItem>
          {getPageNumbers().map((p) => (
            <PaginationItem key={p}>
              <PaginationLink 
                href="#" 
                isActive={p === page}
                onClick={(e) => { e.preventDefault(); handlePageChange(p); }}
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          ))}
          {page + 2 < totalPages && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationNext 
              href="#" 
              onClick={(e) => { e.preventDefault(); handlePageChange(page + 1); }} 
              className={page === totalPages ? 'pointer-events-none opacity-50' : ''} 
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export default OrdersTable
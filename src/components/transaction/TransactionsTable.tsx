import { FC } from 'react'
import { DataTable } from './data-table'
import { columns } from './columns'
import { AnimatedBackground } from '../ui/animated-background'
import { Input } from '../ui/input'
import { ArrowUpDown, Download, Ellipsis, ListFilter, SearchIcon } from 'lucide-react'
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

interface OrdersTableProps {

}
type Payment = {
  order: string
  date: Date
  customer: { namme: string, email: string }
  payment: "successful" | 'failed' | 'notpaid'
  status: "cancled" | "delivered" | "scheduled"
  method: 'momo' | 'mastercard'
}

const payments: Payment[] = [
  {
    order: "345901",
    date: new Date("2025-01-12"),
    customer: { namme: "Alice Johnson", email: "alice@example.com" },
    payment: "successful",
    status: "delivered",
    method: "momo",
  },
  {
    order: "345902",
    date: new Date("2025-02-03"),
    customer: { namme: "Bob Smith", email: "bob@example.com" },
    payment: "failed",
    status: "cancled",
    method: "mastercard",
  },
  {
    order: "345903",
    date: new Date("2025-03-15"),
    customer: { namme: "Carla Green", email: "carla@example.com" },
    payment: "notpaid",
    status: "scheduled",
    method: "momo",
  },
  {
    order: "345904",
    date: new Date("2025-04-08"),
    customer: { namme: "David Lee", email: "david@example.com" },
    payment: "successful",
    status: "delivered",
    method: "mastercard",
  },
  {
    order: "345905",
    date: new Date("2025-04-22"),
    customer: { namme: "Eva Brown", email: "eva@example.com" },
    payment: "failed",
    status: "cancled",
    method: "momo",
  },
  {
    order: "345906",
    date: new Date("2025-05-01"),
    customer: { namme: "Frank Miller", email: "frank@example.com" },
    payment: "successful",
    status: "scheduled",
    method: "mastercard",
  },
  {
    order: "345907",
    date: new Date("2025-05-11"),
    customer: { namme: "Grace Wilson", email: "grace@example.com" },
    payment: "notpaid",
    status: "cancled",
    method: "momo",
  },
  {
    order: "345908",
    date: new Date("2025-06-06"),
    customer: { namme: "Henry Adams", email: "henry@example.com" },
    payment: "successful",
    status: "delivered",
    method: "momo",
  },
  {
    order: "345909",
    date: new Date("2025-07-14"),
    customer: { namme: "Ivy Clark", email: "ivy@example.com" },
    payment: "failed",
    status: "scheduled",
    method: "mastercard",
  },
  {
    order: "345910",
    date: new Date("2025-08-01"),
    customer: { namme: "Jack Turner", email: "jack@example.com" },
    payment: "successful",
    status: "delivered",
    method: "momo",
  },
]

const TransactionsTable: FC<OrdersTableProps> = () => {
  return <div className='p-5 rounded-2xl bg-white mt-10'>
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
          {['All', 'Pending', 'Approved', 'Failed', 'Canceled'].map((label, index) => {
            return (
              <button
                key={index}
                data-id={label}
                type='button'
                aria-label={`${label} view`}
                className="inline-flex h-10 px-2 items-center text-zinc-800 transition-transform active:scale-[0.98] data-[data-checked=true]:text-red-500 dark:text-zinc-50 group"
              >
                <span className='font-semibold mr-2'>{label}</span>
                <span className='text-[#F26823] opacity-0 group-data-[checked="true"]:opacity-100 transition-all'>(240)</span>
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
    <DataTable columns={columns} data={payments} />
    <Pagination className='mt-5'>
      <PaginationContent>
        <PaginationItem className="hidden xs:block">
          <PaginationPrevious href="#" className="" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink size={'sm'} href="#">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink size={'sm'} href="#">3</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink size={'sm'} href="#" isActive>
            8
          </PaginationLink>
        </PaginationItem>
        <PaginationItem className="hidden xs:block">
          <PaginationNext href="#" className="" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  </div>
}

export default TransactionsTable
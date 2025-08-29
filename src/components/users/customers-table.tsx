"use client"

import { useMemo, useState } from "react"
import { DataTable } from "./data-table" // Assuming you have a reusable DataTable
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Phone, MapPin, ChevronLeft, ChevronRight } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { createCustomerColumns, type Customer } from "./customer-columns" // Adjust path if needed

const mockCustomers: Customer[] = [
  {
    id: "#CUST001",
    name: "John Doe",
    email: "john.doe@email.com",
    phone: "+1234567890",
    location: "New York, USA",
    orderCount: 25,
    totalSpend: 3450.0,
    status: "Active",
    totalOrders: 25,
    completedOrders: 23,
    cancelledOrders: 2,
  },
  {
    id: "#CUST002",
    name: "Jane Smith",
    email: "jane.smith@email.com",
    phone: "+1234567890",
    location: "Los Angeles, USA",
    orderCount: 5,
    totalSpend: 250.0,
    status: "Inactive",
    totalOrders: 5,
    completedOrders: 3,
    cancelledOrders: 2,
  },
  {
    id: "#CUST003",
    name: "Emily Davis",
    email: "emily.davis@email.com",
    phone: "+1234567890",
    location: "Chicago, USA",
    orderCount: 30,
    totalSpend: 4600.0,
    status: "VIP",
    totalOrders: 30,
    completedOrders: 28,
    cancelledOrders: 2,
  },
  {
    id: "#CUST004",
    name: "Severin RUTAYISIRE",
    email: "severin@nihemart.com",
    phone: "+250785112121",
    location: "Kaçyiru, Gasabo",
    orderCount: 150,
    totalSpend: 12500.0,
    status: "VIP",
    totalOrders: 150,
    completedOrders: 140,
    cancelledOrders: 10,
  },
]

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function CustomerTable() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [viewCustomerModalOpened, setViewCustomerModalOpened] = useState<boolean>(false)

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setViewCustomerModalOpened(true)
  }

  const handleCloseModal = () => {
    setViewCustomerModalOpened(false)
  }

  // Create the columns using the factory function, wrapped in useMemo for performance
  const columns = useMemo(() => createCustomerColumns(handleViewCustomer), [])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Customer Details</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Use the generic DataTable component */}
          <DataTable columns={columns} data={mockCustomers} />

          {/* Pagination can be part of DataTable or separate like this */}
          <div className="flex items-center justify-end space-x-2 py-4 mt-3">
            <Pagination>
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

        </CardContent>
      </Card>

      {/* Customer Detail Modal (remains the same) */}
      <Dialog open={viewCustomerModalOpened} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-md">

          <>
            <DialogHeader>
              <DialogTitle className="sr-only">Customer Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {getInitials(selectedCustomer?.name ?? '')}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedCustomer?.name}</h3>
                  <p className="text-gray-600 text-sm">{selectedCustomer?.email}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Customer Info</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{selectedCustomer?.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{selectedCustomer?.location}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Order overview</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedCustomer?.totalOrders}</div>
                    <div className="text-xs text-blue-600">Total order</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{selectedCustomer?.completedOrders}</div>
                    <div className="text-xs text-green-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{selectedCustomer?.cancelledOrders}</div>
                    <div className="text-xs text-red-600">Cancelled</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        </DialogContent>
      </Dialog>
    </>
  )
}
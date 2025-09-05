"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { Dot, MoreHorizontal } from "lucide-react"
import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import { format, isValid } from "date-fns"
import { UserAvatarProfile } from "../user-avatar-profile"
import { cn } from "@/lib/utils"
import { Badge } from "../ui/badge"
import Image from "next/image"
import { momoIcon } from "@/assets"
import { Icons } from "../icons"

// Import the Supabase Order type
import { Order } from '@/integrations/supabase/products'

const Status = ({ status }: { status: Order["status"] }) => {
  return (
    <Badge
      className={cn(
        "capitalize font-semibold",
        {
          "bg-green-500/10 text-green-500": status === "delivered",
          "bg-yellow-500/10 text-yellow-500": status === "pending" || status === "processing" || status === "shipped",
          "bg-red-500/10 text-red-500": status === "cancelled",
        }
      )}
    >
      {status}
    </Badge>
  )
}

const Payment = ({ status }: { status: Order["payment_status"] }) => {
  return (
    <div
      className={cn(
        "flex items-center capitalize font-semibold",
        { "text-green-500": status === "paid" },
        { "text-red-500": status === "failed" },
        { "text-yellow-500": status === "pending" }
      )}
    >
      <Dot strokeWidth={7} />
      {status}
    </div>
  )
}

const PaymentMethod = ({ method }: { method: Order["payment_method"] }) => {
  switch (method) {
    case "mobile_money":
      return <Image src={momoIcon} alt="momoIcon" height={30} width={70} />
    case "credit_card":
      return (
        <div className="flex items-center gap-1">
          <Icons.orders.masterCard /> ... 1234
        </div>
      )
    default:
      return null
  }
}

export const columns: ColumnDef<Order>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "order_number",
    header: "ORDER",
    cell: ({ row }) => <span className="text-text-primary">#{row.getValue("order_number") || row.original.id}</span>,
  },
  {
    accessorKey: "created_at",
    header: "DATE",
    cell: ({ row }) => {
      const dateValue = row.getValue("created_at")
      const date = typeof dateValue === "string" ? new Date(dateValue) : dateValue
      return (
        <span className="text-text-secondary">
          {isValid(date) ? format(date, "MMMM d, yyyy, HH:mm") : "Invalid Date"}
        </span>
      )
    },
  },
  {
    id: "customer",
    header: "CUSTOMER",
    cell: ({ row }) => {
      const customerName = `${row.original.customer_first_name || ''} ${row.original.customer_last_name || ''}`.trim() || 'Unknown'
      const customerEmail = row.original.customer_email || 'Unknown'
      return (
        <div className="">
          <UserAvatarProfile
            user={{ fullName: customerName, subTitle: customerEmail }}
            showInfo
          />
        </div>
      )
    },
  },
  {
    accessorKey: "payment_status",
    header: "PAYMENT",
    cell: ({ row }) => <Payment status={row.getValue("payment_status") || "pending"} />,
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => <Status status={row.getValue("status") || "pending"} />,
  },
  {
    accessorKey: "payment_method",
    header: "METHOD",
    cell: ({ row }) => <PaymentMethod method={row.getValue("payment_method") || "mobile_money"} />,
  },
  {
    id: "actions",
    size: 10,
    cell: ({ row }) => {
      const payment = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(payment.order_number || payment.id)}>
              Copy order ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View customer</DropdownMenuItem>
            <DropdownMenuItem>View order details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
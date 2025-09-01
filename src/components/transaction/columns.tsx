"use client"

import { momoIcon } from "@/assets"
import { cn } from "@/lib/utils"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { Dot, MoreHorizontal } from "lucide-react"
import Image from "next/image"
import { Icons } from "../icons"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Checkbox } from "../ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu"

type Payment = {
    order: string
    date: Date
    customer: { namme: string, email: string }
    payment: "successful" | 'failed' | 'notpaid'
    status: "cancled" | "delivered" | "scheduled"
    method: 'momo' | 'mastercard'
}

const Status = ({ status }: { status: "cancled" | "delivered" | "scheduled" }) => {
    return <Badge
        className={cn("capitalize font-semibold",
            { "bg-green-500/10 text-green-500": status == 'delivered' },
            { "bg-yellow-500/10 text-yellow-500": status == 'scheduled' },
            { "bg-red-500/10 text-red-500": status == 'cancled' },
        )}
    >{status}</Badge>
}

const Payment = ({ status }: { status: "successful" | 'failed' | 'notpaid' }) => {
    return <div className={cn("flex items-center capitalize font-semibold",
        { "text-green-500": status == 'successful' },
        { "text-red-500": status == 'failed' },
        { "text-yellow-500": status == 'notpaid' },
    )}><Dot strokeWidth={7} />{status}</div>
}


const PaymentMethod = ({ method }: { method: 'momo' | 'mastercard' }) => {
    switch (method) {
        case 'momo':
            return <Image src={momoIcon} alt="momoIcon" height={30} width={70} />;
        case 'mastercard':
            return <div className="flex items-center gap-1"><Icons.orders.masterCard /> ... 1234</div>
        default:
            return null;
    }
}

export const columns: ColumnDef<Payment>[] = [
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
                }
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
        accessorKey: "order",
        header: "ORDER",
        cell: ({ row }) => <span className="text-text-primary">#{row.getValue('order')}</span>
    },
    {
        id: "customer",
        accessorKey: "customer.namme",
        header: "Name",
    },
    {
        accessorKey: "date",
        header: "DATE",
        cell: ({ row }) => <span className="text-text-secondary">{format(new Date(row.getValue('date')), "MMMM d, yyyy, HH:mm")}</span>
    },
    {
        accessorKey: "amount",
        header: () => <div className="">Amount</div>,
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("amount"))
            const formatted = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "RWF",
            }).format(1300)

            return <div className="">{formatted}</div>
        },
    },
    {
        accessorKey: "method",
        header: "METHOD",
        cell: ({ row }) => <PaymentMethod method={row.getValue('method') || ''} />
    },
    {
        accessorKey: "payment",
        header: "Status",
        cell: ({ row }) => <Payment status={row.getValue('payment') || ''} />
    },
    // {
    //     accessorKey: "status",
    //     header: "STATUS",
    //     cell: ({ row }) => <Status status={row.getValue('status') || ''} />
    // },
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
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(payment.order)}
                        >
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
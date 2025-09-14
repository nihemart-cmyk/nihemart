"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Dot, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Checkbox } from "../ui/checkbox";

// 1. Define the Customer type
export interface Customer {
   id: string;
   name: string;
   email: string;
   phone: string;
   location: string;
   orderCount: number;
   totalSpend: number;
   status: "Active" | "Inactive" | "VIP";
   totalOrders: number;
   completedOrders: number;
   cancelledOrders: number;
}

// 2. Create a reusable component for the status cell
const Status = ({ status }: { status: Customer["status"] }) => {
   return (
      <div
         className={cn(
            "flex items-center gap-2 capitalize font-medium",
            { "text-green-500": status === "Active" },
            { "text-red-500": status === "Inactive" },
            { "text-yellow-500": status === "VIP" }
         )}
      >
         <Dot
            className={cn(
               { "text-green-500": status === "Active" },
               { "text-red-500": status === "Inactive" },
               { "text-yellow-500": status === "VIP" }
            )}
            strokeWidth={8}
         />
         {status}
      </div>
   );
};

// Helper function for name initials
const getInitials = (name: string) => {
   return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
};

// 3. Define and export the columns
export const createCustomerColumns = (
   handleViewCustomer: (customer: Customer) => void,
   handleToggleAdmin?: (
      customerId: string,
      makeAdmin?: boolean
   ) => Promise<void>,
   handleDelete?: (customerId: string) => Promise<void>
): ColumnDef<Customer>[] => [
   {
      accessorKey: "id",
      header: "Customer ID",
      cell: ({ row }) => (
         <div className="font-medium">{row.getValue("id")}</div>
      ),
   },
   {
      accessorKey: "name",
      header: "Name",
   },
   {
      accessorKey: "phone",
      header: "Phone",
   },
   {
      accessorKey: "orderCount",
      header: "Order Count",
   },
   {
      accessorKey: "totalSpend",
      header: () => <div>Total Spend</div>,
      cell: ({ row }) => {
         const amount = parseFloat(row.getValue("totalSpend"));
         const formatted = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
         }).format(amount);
         return <div>{formatted}</div>;
      },
   },
   {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Status status={row.getValue("status")} />,
   },
   {
      id: "actions",
      cell: ({ row }) => {
         const customer = row.original;
         return (
            <DropdownMenu>
               <DropdownMenuTrigger asChild>
                  <Button
                     variant="ghost"
                     className="h-8 w-8 p-0"
                  >
                     <span className="sr-only">Open menu</span>
                     <MoreHorizontal className="h-4 w-4" />
                  </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end">
                  <DropdownMenuItem
                     onClick={() => handleViewCustomer(customer)}
                  >
                     <Eye className="mr-2 h-4 w-4" />
                     <span>View Details</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={async () => {
                        if (handleToggleAdmin) {
                           const makeAdmin = customer.status !== "VIP";
                           await handleToggleAdmin(customer.id, makeAdmin);
                        }
                     }}
                  >
                     <Dot className="mr-2 h-4 w-4" />
                     <span>
                        {customer.status === "VIP"
                           ? "Revoke Admin"
                           : "Make Admin"}
                     </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     className="text-red-600 focus:text-red-600"
                     onClick={async () => {
                        if (handleDelete) await handleDelete(customer.id);
                     }}
                  >
                     <Trash2 className="mr-2 h-4 w-4" />
                     <span>Delete Customer</span>
                  </DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>
         );
      },
   },
];

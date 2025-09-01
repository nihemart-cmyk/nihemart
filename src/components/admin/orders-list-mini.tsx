"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Download, MoreVertical } from "lucide-react";
import Link from "next/link";
import { DataTable } from "../orders/data-table";
import { ColumnDef } from "@tanstack/react-table";

type Payment = {
  order: string;
  date: Date;
  customer: { name: string; email: string };
  payment: "successful" | "failed" | "notpaid";
  status: "canceled" | "delivered" | "scheduled";
  method: "momo" | "mastercard";
};

const payments: Payment[] = [
  {
    order: "#345918",
    date: new Date("2025-06-15"),
    customer: { name: "Severin RUTAYISIRE", email: "severin@ntinemart.com" },
    payment: "successful",
    status: "scheduled",
    method: "mastercard",
  },
  {
    order: "#345817",
    date: new Date("2025-06-15"),
    customer: { name: "Severin RUTAYISIRE", email: "severin@ntinemart.com" },
    payment: "successful",
    status: "scheduled",
    method: "momo",
  },
  {
    order: "#345716",
    date: new Date("2025-06-15"),
    customer: { name: "Severin RUTAYISIRE", email: "severin@ntinemart.com" },
    payment: "successful",
    status: "canceled",
    method: "mastercard",
  },
  {
    order: "#345615",
    date: new Date("2025-06-15"),
    customer: { name: "Severin RUTAYISIRE", email: "severin@ntinemart.com" },
    payment: "successful",
    status: "delivered",
    method: "momo",
  },
  {
    order: "#345514",
    date: new Date("2025-06-15"),
    customer: { name: "Severin RUTAYISIRE", email: "severin@ntinemart.com" },
    payment: "successful",
    status: "delivered",
    method: "momo",
  },
];

const formatDate = (date: Date) => {
  return `${date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}, ${date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const getPaymentStatusStyle = (status: string) => {
  switch (status) {
    case "successful":
      return "bg-green-100 text-green-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "notpaid":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case "delivered":
      return "bg-green-100 text-green-800";
    case "canceled":
      return "bg-red-100 text-red-800";
    case "scheduled":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const capitalizeFirst = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const columns: ColumnDef<Payment>[] = [
  {
    id: "select",
    header: () => <input type="checkbox" className="rounded" />,
    cell: () => <input type="checkbox" className="rounded" />,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "order",
    header: "ORDER",
    cell: ({ row }) => (
      <div className="font-medium text-gray-900">{row.getValue("order")}</div>
    ),
  },
  {
    accessorKey: "date",
    header: "DATE",
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">{formatDate(row.getValue("date"))}</div>
    ),
  },
  {
    accessorKey: "customer",
    header: "CUSTOMER",
    cell: ({ row }) => {
      const customer = row.getValue("customer") as { name: string; email: string };
      return (
        <div>
          <p className="font-medium text-gray-900">{customer.name}</p>
          <p className="text-sm text-gray-500 truncate max-w-[200px]">{customer.email}</p>
        </div>
      );
    },
  },
  {
    accessorKey: "payment",
    header: "PAYMENT",
    cell: ({ row }) => (
      <span
        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusStyle(
          row.getValue("payment")
        )}`}
      >
        {capitalizeFirst(row.getValue("payment"))}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "STATUS",
    cell: ({ row }) => (
      <span
        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(
          row.getValue("status")
        )}`}
      >
        {capitalizeFirst(row.getValue("status"))}
      </span>
    ),
  },
  {
    accessorKey: "method",
    header: "ACTIONS",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.getValue("method") === "momo" ? (
          <div className="border-2 border-black rounded-full px-2 py-1">
            <span className="text-xs font-bold">MTN</span>
          </div>
        ) : (
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-600 rounded-full"></div>
            <div className="w-4 h-4 bg-orange-500 rounded-full -ml-2"></div>
          </div>
        )}
        <MoreVertical className="w-4 h-4" />
      </div>
    ),
  },
];

// Orders List Mini Component
const OrdersListMini: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 md:p-6 border-b">
        <div className="mb-3 sm:mb-0">
          <h3 className="text-lg font-bold text-gray-900">Order List</h3>
          <p className="text-sm text-gray-600">
            Track orders list across your store.
          </p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="p-4">
        <DataTable columns={columns} data={payments} />
      </div>

      <div className="p-4 border-t bg-gray-50">
        <Link
          href="/admin/orders"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          All orders →
        </Link>
      </div>
    </div>
  );
};

export default OrdersListMini;
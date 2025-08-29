'use client';

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const orders = [
  {
    orderId: "12345",
    location: "Kn 1122 st, Kigali",
    phoneNumber: "$250.00",
    action: "Accept",
  },
  {
    orderId: "12346",
    location: "Kn 1133 st, Kigali",
    phoneNumber: "$150.00",
    action: "Reject",
  },
  {
    orderId: "12347",
    location: "Kn 1144 st, Kigali",
    phoneNumber: "$350.00",
    action: "Accept",
  },
  {
    orderId: "12348",
    location: "Kn 1155 st, Kigali",
    phoneNumber: "$450.00",
    action: "Accept",
  },
  {
    orderId: "12349",
    location: "Kn 1166 st, Kigali",
    phoneNumber: "$550.00",
    action: "Reject",
  },
  {
    orderId: "12350",
    location: "Kn 1177 st, Kigali",
    phoneNumber: "$200.00",
    action: "Reject",
  },
  {
    orderId: "12351",
    location: "Kn 1188 st, Kigali",
    phoneNumber: "$300.00",
    action: "Accept",
  },
];

const Page = () => {
  // Track selected action for each order
  const [orderActions, setOrderActions] = useState(
    orders.reduce((acc, order) => {
      acc[order.orderId] = order.action;
      return acc;
    }, {} as Record<string, string>)
  );

  const handleActionChange = (orderId: string, value: string) => {
    setOrderActions((prev) => ({
      ...prev,
      [orderId]: value,
    }));
  };

  return (
    <div className="p-5">
      {/* Full width tabs container */}
      <Tabs defaultValue="orders" className="">
        <TabsList className="">
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="">
          <div className="overflow-x-auto w-full">
            <Table className="min-w-full">
              <TableCaption>A list of your assigned orders.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Order Details</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.orderId}>
                    <TableCell className="font-medium">
                      Order #{order.orderId}
                    </TableCell>
                    <TableCell>{order.location}</TableCell>
                    <TableCell>{order.phoneNumber}</TableCell>
                    <TableCell className="p-2 text-center w-28">
                      <Select
                        value={orderActions[order.orderId]}
                        onValueChange={(value) =>
                          handleActionChange(order.orderId, value)
                        }
                      >
                        <SelectTrigger className="w-24 mx-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Accept">Accept</SelectItem>
                          <SelectItem value="Reject">Reject</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="statistics">Coming soon.</TabsContent>
        <TabsContent value="settings">Coming soon.</TabsContent>
      </Tabs>
    </div>
  );
};

export default Page;

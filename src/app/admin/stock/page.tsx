"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, History } from "lucide-react";
import { useRouter } from "next/navigation";
import StockOverview from "@/components/admin/stock-overview";
import StockLevels from "@/components/admin/stock-levels";
import OrdersTable from "@/components/orders/OrdersTable";

export default function StockPage() {
   const router = useRouter();
   const [activeTab, setActiveTab] = useState("overview");

   return (
      <ScrollArea className="h-screen pb-20">
         <div className="min-h-screen bg-gray-50 p-6">
            <div className="mx-auto">
               {/* Header */}
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                     <h1 className="text-2xl font-semibold text-gray-900">
                        Stock Dashboard
                     </h1>
                     <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        Active
                     </span>
                  </div>
                  <Button
                     onClick={() => router.push("/admin/products/new")}
                     className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                     <Plus className="w-4 h-4 mr-2" />
                     Add New Stock
                  </Button>
               </div>

               {/* Tabs */}
               <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
               >
                  <TabsList className="grid w-full max-w-5xl grid-cols-4 bg-transparent border-b shadow-none rounded-none p-0">
                     <TabsTrigger
                        value="overview"
                        className="data-[state=active]:bg-transparent data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500 shadow-none rounded-none"
                     >
                        Overview
                     </TabsTrigger>
                     <TabsTrigger
                        value="stock-levels"
                        className="data-[state=active]:bg-transparent shadow-none rounded-none data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500"
                     >
                        Stock Levels
                     </TabsTrigger>
                     <TabsTrigger
                        value="orders"
                        className="data-[state=active]:bg-transparent shadow-none rounded-none data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500"
                     >
                        Orders
                     </TabsTrigger>
                     <TabsTrigger
                        value="history"
                        className="data-[state=active]:bg-transparent shadow-none rounded-none data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-500"
                     >
                        <History className="w-4 h-4 mr-2" />
                        History
                     </TabsTrigger>
                  </TabsList>

                  <TabsContent
                     value="overview"
                     className="mt-6"
                  >
                     <ScrollArea className="h-[calc(100vh-200px)]">
                        <StockOverview onTabChange={setActiveTab} />
                     </ScrollArea>
                  </TabsContent>

                  <TabsContent
                     value="stock-levels"
                     className="mt-6"
                  >
                     <ScrollArea className="h-[calc(100vh-200px)]">
                        <StockLevels />
                     </ScrollArea>
                  </TabsContent>

                  <TabsContent
                     value="orders"
                     className="mt-6"
                  >
                     <ScrollArea className="h-[calc(100vh-200px)]">
                        <OrdersTable />
                     </ScrollArea>
                  </TabsContent>

                  <TabsContent
                     value="history"
                     className="mt-6"
                  >
                     <ScrollArea className="h-[calc(100vh-200px)]">
                        <div className="bg-white rounded-lg p-8 text-center">
                           <History className="h-12 w-12 mx-auto mb-4 text-orange-600" />
                           <h3 className="text-lg font-medium text-gray-900 mb-2">
                              Stock History
                           </h3>
                           <p className="text-gray-500 mb-4">
                              View detailed audit trail of all stock changes
                           </p>
                           <Button
                              onClick={() => router.push("/admin/stock/history")}
                              className="bg-orange-500 hover:bg-orange-600 text-white"
                           >
                              <History className="w-4 h-4 mr-2" />
                              View Full History
                           </Button>
                        </div>
                     </ScrollArea>
                  </TabsContent>
               </Tabs>
            </div>
         </div>
      </ScrollArea>
   );
}

"use client";
import React, { useEffect, useRef } from "react";
import { Search, Columns, ChevronDown, X } from "lucide-react";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface TableFiltersProps {
   searchTerm: string;
   onSearchChange: (term: string) => void;
   categoryFilter: string;
   onCategoryChange: (value: string) => void;
   uniqueCategories: string[];
   statusFilter: string;
   onStatusChange: (value: string) => void;
   uniqueStatuses: string[];
   stockFilter: string;
   onStockChange: (value: string) => void;
   stockOptions: readonly ("all" | "in-stock" | "out-of-stock")[]; // Fixed: added 'readonly'
   columns: string[];
   visibleColumns: string[];
   toggleColumn: (columnKey: string) => void;
   showViewOptions: boolean;
   setShowViewOptions: (show: boolean) => void;
}

export const TableFilters = ({
   searchTerm,
   onSearchChange,
   categoryFilter,
   onCategoryChange,
   uniqueCategories,
   statusFilter,
   onStatusChange,
   uniqueStatuses,
   stockFilter,
   onStockChange,
   stockOptions,
   columns,
   visibleColumns,
   toggleColumn,
   showViewOptions,
   setShowViewOptions,
}: TableFiltersProps) => {
   const viewOptionsRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (
            viewOptionsRef.current &&
            !viewOptionsRef.current.contains(event.target as Node)
         ) {
            setShowViewOptions(false);
         }
      };

      if (showViewOptions) {
         document.addEventListener("mousedown", handleClickOutside);
      }

      return () =>
         document.removeEventListener("mousedown", handleClickOutside);
   }, [showViewOptions, setShowViewOptions]);

   const getColumnLabel = (column: string) => {
      const labels: Record<string, string> = {
         product: "Product",
         category: "Category",
         stock: "Stock",
         price: "Price",
         qty: "Quantity",
         status: "Status",
      };
      return labels[column] || column.charAt(0).toUpperCase() + column.slice(1);
   };

   return (
      <div className="py-4">
         {/* Search Bar */}

         <div className="flex flex-col md:flex-row w-full md:justify-between gap-6">
            <div className="flex-1 relative">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
               <Input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full  focus:none border-none shadow-none"
               />
            </div>

            {/* Filters Row */}
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-4 flex-wrap">
                  {/* Status Filter */}
                  <Select
                     value={statusFilter}
                     onValueChange={onStatusChange}
                  >
                     <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                     </SelectTrigger>
                     <SelectContent>
                        {uniqueStatuses.map((status) => (
                           <SelectItem
                              key={status}
                              value={status}
                           >
                              {status === "all" ? "All Status" : status}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>

                  {/* Category Filter */}
                  <Select
                     value={categoryFilter}
                     onValueChange={onCategoryChange}
                  >
                     <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Category" />
                     </SelectTrigger>
                     <SelectContent>
                        {uniqueCategories.map((cat) => (
                           <SelectItem
                              key={cat}
                              value={cat}
                           >
                              {cat === "all" ? "All Categories" : cat}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>

                  {/* Stock Filter */}
                  <Select
                     value={stockFilter}
                     onValueChange={onStockChange}
                  >
                     <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Stock" />
                     </SelectTrigger>
                     <SelectContent>
                        {stockOptions.map((option) => (
                           <SelectItem
                              key={option}
                              value={option}
                           >
                              {option === "all"
                                 ? "All Stock"
                                 : option.replace("-", " ")}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
                  {/* View Options */}
                  <Button
                     variant="outline"
                     size="sm"
                     className="relative flex items-center gap-1 border-gray-300 px-3 py-2 text-sm hover:bg-gray-100"
                     onClick={(e) => {
                        e.stopPropagation();
                        setShowViewOptions(!showViewOptions);
                     }}
                  >
                     <Columns className="h-4 w-4" />
                     <span>View</span>
                     <ChevronDown className="h-4 w-4" />

                     {showViewOptions && (
                        <div
                           ref={viewOptionsRef}
                           className="absolute top-full right-0 z-50 mt-1 w-48 rounded-md border bg-white py-2 shadow-lg"
                           onClick={(e) => e.stopPropagation()}
                        >
                           <div className="border-b px-3 py-2 text-sm font-medium text-gray-700">
                              Visible Columns
                           </div>
                           {columns.map((column) => (
                              <label
                                 key={column}
                                 className="flex cursor-pointer items-center px-3 py-2 hover:bg-gray-50"
                                 onClick={(e) => e.stopPropagation()}
                              >
                                 <Checkbox
                                    checked={visibleColumns.includes(column)}
                                    onCheckedChange={() => toggleColumn(column)}
                                    className="mr-2 h-3.5 w-3.5"
                                 />
                                 <span className="text-sm text-gray-700 select-none">
                                    {getColumnLabel(column)}
                                 </span>
                              </label>
                           ))}
                        </div>
                     )}
                  </Button>
               </div>
            </div>
         </div>
      </div>
   );
};
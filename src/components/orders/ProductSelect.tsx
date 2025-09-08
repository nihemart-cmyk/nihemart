"use client";

import { Product } from "@/integrations/supabase/products";
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
   Command,
   CommandEmpty,
   CommandGroup,
   CommandInput,
   CommandItem,
} from "@/components/ui/command";
import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover";

interface ProductSelectProps {
   onSelect: (product: Product) => void;
   products: Product[];
   selectedProduct?: Product | null;
}

export function ProductSelect({
   onSelect,
   products,
   selectedProduct,
}: ProductSelectProps) {
   const [open, setOpen] = useState(false);

   return (
      <Popover
         open={open}
         onOpenChange={setOpen}
      >
         <PopoverTrigger asChild>
            <Button
               variant="outline"
               role="combobox"
               aria-expanded={open}
               className="w-full justify-between"
            >
               {selectedProduct ? selectedProduct.name : "Select product..."}
               <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
         </PopoverTrigger>
         <PopoverContent className="w-full p-0">
            <Command>
               <CommandInput placeholder="Search products..." />
               <CommandEmpty>No product found.</CommandEmpty>
               <CommandGroup className="max-h-60 overflow-y-auto">
                  {products.map((product) => (
                     <CommandItem
                        key={product.id}
                        value={product.name}
                        onSelect={() => {
                           onSelect(product);
                           setOpen(false);
                        }}
                     >
                        <Check
                           className={cn(
                              "mr-2 h-4 w-4",
                              selectedProduct?.id === product.id
                                 ? "opacity-100"
                                 : "opacity-0"
                           )}
                        />
                        {product.name}
                        <span className="ml-auto text-muted-foreground">
                           {product.price?.toLocaleString()} RWF
                        </span>
                     </CommandItem>
                  ))}
               </CommandGroup>
            </Command>
         </PopoverContent>
      </Popover>
   );
}

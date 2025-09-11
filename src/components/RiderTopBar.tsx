"use client";
import {
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
   Sheet,
   SheetContent,
   SheetTitle,
   SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DropdownMenuGroup } from "@radix-ui/react-dropdown-menu";
import { CircleEllipsis, LogOut, Menu } from "lucide-react";
import { useRouter } from "next13-progressbar";
import { FC } from "react";
import Sidebar from "./Sidebar";
import { Button } from "./ui/button";
import { DropdownMenu } from "./ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type TopBarProps = {
   className?: string;
} & (
   | {
        variant: "primary";
        title: string;
     }
   | {
        variant: "secondary";
     }
);

const RiderTopBar: FC<TopBarProps> = (props) => {
   const router = useRouter();
   const { className, variant } = props;
   const { signOut } = useAuth();

   const handleLogout = async () => {
      await signOut();
      toast.success("Logged out successfully");
   };

   return (
      <div
         className={cn(
            "w-full py-3 px-3 lg:px-10 flex items-center justify-between border-b border-b-brand-border bg-white",
            { "bg-surface-secondary": variant === "secondary" },
            className
         )}
      >
         <Sheet>
            <SheetTrigger asChild>
               <Button
                  variant={"ghost"}
                  className="lg:hidden px-0 mr-4"
               >
                  <Menu />
               </Button>
            </SheetTrigger>
            <SheetContent
               side={"left"}
               className="lg:hidden pt-3 pb-6 pr-6 pl-0"
            >
               <SheetTitle className="sr-only">Edit profile</SheetTitle>
               <Sidebar />
            </SheetContent>
         </Sheet>
         <div className="flex gap-5 items-center">
            {variant === "primary" && (
               <h3 className="font-bold text-3xl w-full hidden md:block">
                  {props.title}
               </h3>
            )}
            <Badge className="flex items-center gap-1 text-black bg-gray-200 py-2 rounded-2xl hover:bg-gray-300">
               <div className="h-2 w-2 rounded-full bg-green-600"></div>
               Active
            </Badge>
         </div>
         <div
            className={cn("flex items-center justify-between gap-3 lg:gap-6", {
               "w-full": variant === "secondary",
            })}
         >
            <p className="text-white bg-orange-500 py-1 px-3 rounded-2xl">
               Change Availability
            </p>
            <DropdownMenu>
               <DropdownMenuTrigger asChild>
                  <Button
                     variant="ghost"
                     className="relative px-0"
                  >
                     {/* <CircleEllipsis /> */}
                     <CircleEllipsis size={30} />
                  </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent
                  className="w-56"
                  align="end"
                  sideOffset={10}
                  forceMount
               >
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                     <DropdownMenuItem>Active</DropdownMenuItem>
                     <DropdownMenuItem>En Route</DropdownMenuItem>
                     <DropdownMenuItem>Unavailable</DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                     <LogOut
                        size={20}
                        className="mr-2"
                     />
                     Logout
                  </DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>
         </div>
      </div>
   );
};

export default RiderTopBar;

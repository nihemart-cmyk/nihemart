"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from "../ui/alert-dialog";
import { MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { format, isValid } from "date-fns";
import { UserAvatarProfile } from "../user-avatar-profile";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import Image from "next/image";
import { momoIcon } from "@/assets";
import { Icons } from "../icons";
import { useState } from "react";
import { toast } from "sonner";
import { CustomerDetailsDialog } from "./CustomerDetailsDialog";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import { AssignRiderDialog } from "./AssignRiderDialog";
import { ManageRefundDialog } from "./ManageRefundDialog";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Order, OrderStatus } from "@/types/orders";

const Status = ({ status }: { status: Order["status"] }) => {
   return (
      <Badge
         className={cn("capitalize font-semibold", {
            "bg-green-500/10 text-green-500": status === "delivered",
            "bg-yellow-500/10 text-yellow-500":
               status === "pending" ||
               status === "processing" ||
               status === "shipped",
            "bg-blue-500/10 text-blue-500": status === "assigned",
            "bg-red-500/10 text-red-500": status === "cancelled",
         })}
      >
         {status || "unknown"}
      </Badge>
   );
};

const PaymentMethod = ({ method }: { method?: string }) => {
   const paymentMethod = method || "mobile_money";
   switch (paymentMethod) {
      case "mobile_money":
         return (
            <Image
               src={momoIcon}
               alt="momoIcon"
               height={30}
               width={70}
            />
         );
      case "credit_card":
         return (
            <div className="flex items-center gap-1">
               <Icons.orders.masterCard /> ... 1234
            </div>
         );
      default:
         return <span className="text-sm text-muted-foreground">Unknown</span>;
   }
};

export const columns: ColumnDef<Order>[] = [
   {
      id: "select",
      header: ({ table }) => (
         <Checkbox
            checked={
               table.getIsAllPageRowsSelected() ||
               (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
               table.toggleAllPageRowsSelected(!!value)
            }
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
      cell: ({ row }) => (
         <span className="text-text-primary">
            #{row.getValue("order_number") || row.original.id}
         </span>
      ),
   },
   {
      accessorKey: "created_at",
      header: "DATE",
      cell: ({ row }) => {
         const dateValue = row.getValue("created_at");
         const date =
            typeof dateValue === "string"
               ? new Date(dateValue)
               : (dateValue as Date);
         return (
            <span className="text-text-secondary">
               {isValid(date)
                  ? format(date, "MMMM d, yyyy, HH:mm")
                  : "Invalid Date"}
            </span>
         );
      },
   },
   {
      id: "customer",
      header: "CUSTOMER",
      cell: ({ row }) => {
         const customerName =
            `${row.original.customer_first_name || ""} ${
               row.original.customer_last_name || ""
            }`.trim() || "Unknown";
         const customerEmail = row.original.customer_email || "Unknown";
         return (
            <div className="">
               <UserAvatarProfile
                  user={{ fullName: customerName, subTitle: customerEmail }}
                  showInfo
               />
            </div>
         );
      },
   },

   {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ row }) => {
         const [isUpdating, setIsUpdating] = useState(false);
         const { updateOrderStatus } = useOrders();
         const currentStatus = (row.getValue("status") ||
            "pending") as OrderStatus;
         const isExternal = !!row.original.is_external;

         const handleStatusChange = async (newStatus: OrderStatus) => {
            if (isUpdating) return;
            try {
               setIsUpdating(true);
               await updateOrderStatus.mutateAsync({
                  id: row.original.id,
                  status: newStatus,
               });
            } catch (error) {
               console.error("Failed to update order status:", error);
            } finally {
               setIsUpdating(false);
            }
         };

         return (
            <DropdownMenu>
               <DropdownMenuTrigger
                  disabled={isUpdating || !isExternal}
                  className="w-full"
               >
                  <div
                     className={
                        isUpdating ? "opacity-50 cursor-not-allowed" : ""
                     }
                  >
                     <Status status={currentStatus} />
                  </div>
               </DropdownMenuTrigger>
               <DropdownMenuContent>
                  <DropdownMenuLabel>
                     Update Status
                     {!isExternal && (
                        <span className="ml-2 text-xs text-zinc-500">
                           (external orders only)
                        </span>
                     )}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                     onClick={() => handleStatusChange("pending")}
                     disabled={!isExternal}
                  >
                     Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() => handleStatusChange("processing")}
                     disabled={!isExternal}
                  >
                     Processing
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() =>
                        handleStatusChange("assigned" as OrderStatus)
                     }
                     disabled={!isExternal}
                  >
                     Assigned
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() => handleStatusChange("delivered")}
                     disabled={!isExternal}
                  >
                     Delivered
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() => handleStatusChange("cancelled")}
                     disabled={!isExternal}
                  >
                     Cancelled
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     onClick={() =>
                        handleStatusChange("refunded" as OrderStatus)
                     }
                     disabled={!isExternal}
                  >
                     Refunded
                  </DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>
         );
      },
   },
   /*
   {
      id: "method",
      header: "METHOD",
      // The payment method UI cell is preserved here for reference.
      // Commented out per request to hide the column while keeping the
      // implementation available for future re-enablement.
      cell: () => <PaymentMethod method="mobile_money" />,
   },
   */
   {
      accessorKey: "total",
      header: "AMOUNT",
      cell: ({ row }) => (
         <div className="font-medium">
            {row.getValue<number>("total").toLocaleString()} RWF
         </div>
      ),
   },
   {
      id: "actions",
      size: 10,
      cell: ({ row }) => {
         const order = row.original;
         const { updateOrderStatus } = useOrders();
         const hasRefund =
            (Array.isArray(order.items) &&
               order.items.some((it) => it.refund_status === "requested")) ||
            order.refund_status === "requested";
         const { hasRole } = useAuth();
         const isAdmin = hasRole && hasRole("admin");
         const [showCustomerDetails, setShowCustomerDetails] = useState(false);
         const [showOrderDetails, setShowOrderDetails] = useState(false);
         const [showAssignDialog, setShowAssignDialog] = useState(false);
         const [showManageRefund, setShowManageRefund] = useState(false);
         const [showCancelAlert, setShowCancelAlert] = useState(false);
         const [isCancelling, setIsCancelling] = useState(false);
         const refundItem =
            order.items?.find((it) => !!it.refund_status) || null;
         // Determine the mode for the UI label: prefer item-level marker, then order-level,
         // then fallback to delivered_at (delivered -> refund, otherwise reject)
         const computedMode: "refund" | "reject" =
            (refundItem && (refundItem as any)._mode) ||
            (order as any)._mode ||
            (order?.delivered_at ? "refund" : "reject");

         const handleCancelOrder = async () => {
            setIsCancelling(true);
            try {
               await updateOrderStatus.mutateAsync({
                  id: order.id,
                  status: "cancelled",
               } as any);
               toast.success("Order cancelled successfully");
               setShowCancelAlert(false);
            } catch (err: any) {
               toast.error(err?.message || "Failed to cancel order");
            } finally {
               setIsCancelling(false);
            }
         };

         return (
            <>
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
                     <DropdownMenuLabel>Actions</DropdownMenuLabel>
                     <DropdownMenuItem
                        onClick={() =>
                           navigator.clipboard.writeText(
                              order.order_number || order.id
                           )
                        }
                     >
                        Copy order ID
                     </DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuItem
                        onClick={() => setShowCustomerDetails(true)}
                     >
                        View customer
                     </DropdownMenuItem>
                     <DropdownMenuItem
                        onClick={() => setShowOrderDetails(true)}
                     >
                        View order details
                     </DropdownMenuItem>
                     {hasRefund && isAdmin && (
                        <DropdownMenuItem
                           onClick={() => setShowManageRefund(true)}
                        >
                           {computedMode === "reject"
                              ? "Manage reject"
                              : "Manage refund"}
                        </DropdownMenuItem>
                     )}
                     {order.status === "pending" && (
                        <DropdownMenuItem
                           onClick={() => setShowAssignDialog(true)}
                        >
                           Assign to rider
                        </DropdownMenuItem>
                     )}
                     {isAdmin &&
                        (order.status === "pending" ||
                           order.status === "processing") && (
                           <DropdownMenuItem
                              onClick={() => setShowCancelAlert(true)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                           >
                              Cancel Order
                           </DropdownMenuItem>
                        )}
                  </DropdownMenuContent>
               </DropdownMenu>

               <CustomerDetailsDialog
                  open={showCustomerDetails}
                  onOpenChange={setShowCustomerDetails}
                  customer={{
                     firstName: order.customer_first_name,
                     lastName: order.customer_last_name,
                     email: order.customer_email,
                     phone: order.customer_phone,
                  }}
               />

               <OrderDetailsDialog
                  open={showOrderDetails}
                  onOpenChange={setShowOrderDetails}
                  order={order}
               />

               {isAdmin && hasRefund && (
                  <ManageRefundDialog
                     open={showManageRefund}
                     onOpenChange={setShowManageRefund}
                     order={order}
                     item={refundItem}
                  />
               )}

               <AssignRiderDialog
                  open={showAssignDialog}
                  onOpenChange={setShowAssignDialog}
                  orderId={order.id}
               />

               <AlertDialog
                  open={showCancelAlert}
                  onOpenChange={setShowCancelAlert}
               >
                  <AlertDialogContent>
                     <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Order</AlertDialogTitle>
                        <AlertDialogDescription>
                           Are you sure you want to cancel order #
                           {order.order_number || order.id}? This action cannot
                           be undone and will set the order status to
                           &quot;cancelled&quot;.
                        </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCancelling}>
                           No, keep order
                        </AlertDialogCancel>
                        <AlertDialogAction
                           onClick={handleCancelOrder}
                           disabled={isCancelling}
                           className="bg-red-600 hover:bg-red-700 text-white"
                        >
                           {isCancelling
                              ? "Cancelling..."
                              : "Yes, cancel order"}
                        </AlertDialogAction>
                     </AlertDialogFooter>
                  </AlertDialogContent>
               </AlertDialog>
            </>
         );
      },
   },
];

"use client";
import React, { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationsContext";
import { Button } from "@/components/ui/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const NotificationsBell: React.FC = () => {
   const { notifications, markAsRead } = useNotifications();
   const unread = notifications.filter((n) => !n.read).length;
   const router = useRouter();
   const { hasRole } = useAuth();

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button
               variant="ghost"
               size="icon"
               className="relative"
            >
               <Bell className="w-5 h-5" />
               {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                     {unread}
                  </span>
               )}
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent
            align="end"
            className="w-80 max-h-96 overflow-auto"
         >
            {notifications.length === 0 && (
               <DropdownMenuItem className="text-sm">
                  No notifications
               </DropdownMenuItem>
            )}
            {notifications.map((n) => (
               <DropdownMenuItem
                  key={n.id}
                  onClick={() => {
                     markAsRead(n.id);
                     try {
                        // If notification meta contains an order id, navigate to rider order details
                        const meta =
                           typeof n.meta === "string"
                              ? JSON.parse(n.meta)
                              : n.meta || {};
                        // Only navigate to the rider notification detail route when
                        // the current user is a rider (or not an admin). Admins should
                        // not be redirected to rider pages which can cause unexpected
                        // redirects to `/` due to route guards.
                        const isAdmin = hasRole && hasRole("admin");
                        if (!isAdmin) {
                           if (meta && (meta.order?.id || meta.order_id)) {
                              router.push(`/rider/notifications/${n.id}`);
                           }
                        }
                     } catch (e) {
                        // fallback: do nothing special
                     }
                  }}
                  className={`flex flex-col items-start gap-1 py-2 ${
                     n.read ? "opacity-60" : ""
                  }`}
               >
                  <div className="text-sm font-semibold">{n.title}</div>
                  {n.body && (
                     <div className="text-xs text-muted-foreground">
                        {n.body}
                     </div>
                  )}
                  <div className="text-xxs text-muted-foreground mt-1">
                     {new Date(n.created_at).toLocaleString()}
                  </div>
               </DropdownMenuItem>
            ))}
         </DropdownMenuContent>
      </DropdownMenu>
   );
};

export default NotificationsBell;

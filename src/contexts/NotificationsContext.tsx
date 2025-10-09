"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fetchRiderByUserId } from "@/integrations/supabase/riders";
import { toast } from "sonner";

type Notification = {
   id: string;
   title: string;
   body?: string;
   created_at: string;
   read?: boolean;
   meta?: any;
   type?: string;
};

type NotificationsContextValue = {
   notifications: Notification[];
   addNotification: (n: Notification) => void;
   markAsRead: (id: string) => void;
   clear: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
   null
);

export const useNotifications = () => {
   const ctx = useContext(NotificationsContext);
   if (!ctx) throw new Error("useNotifications must be used within provider");
   return ctx;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
   children,
}) => {
   const { user, hasRole } = useAuth();
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const [riderId, setRiderId] = useState<string | null>(null);

   useEffect(() => {
      if (!user) return;

      let notificationsChannel: any = null;
      const addNotificationLocal = (n: Notification) => {
         setNotifications((prev) => [n, ...prev]);
         // Show concise toasts only for important customer-facing events.
         try {
            // Parse meta if present
            const meta =
               typeof n.meta === "string" ? JSON.parse(n.meta) : n.meta || {};

            // Only show assignment_accepted toasts for the order owner (customer)
            if (n.type === "assignment_accepted") {
               // if meta contains rider info, present the rider contact format
               if (meta && (meta.rider_name || meta.rider_phone)) {
                  const riderName =
                     meta.rider_name || meta.rider?.name || "Rider";
                  const riderPhone =
                     meta.rider_phone ||
                     meta.rider?.phone ||
                     "No phone provided";
                  const message = `This rider is going to deliver your order.\n${riderName},\n${riderPhone}`;
                  toast.message(message);
                  return;
               }
               // otherwise show a minimal accepted message
               toast.message(n.title || "Your order will be delivered soon.");
               return;
            }

            // For other types, avoid noisy toasts; show only system/promotion/order updates
            if (
               n.type === "system" ||
               n.type === "promotion" ||
               n.type === "order"
            ) {
               const message = n.title
                  ? `${n.title}${n.body ? ` — ${n.body}` : ""}`
                  : n.body || "You have a new notification.";
               toast.message(message);
            }
         } catch (e) {
            // fallback: show generic toast
            toast.message(n.title || "You have a new notification.");
         }
      };

      const fetchPersisted = async () => {
         try {
            // fetch notifications for this user (explicit recipient_user_id)
            const resUser = await fetch(
               `/api/notifications?userId=${encodeURIComponent(
                  user.id
               )}&limit=100`
            );
            const userJson = resUser.ok
               ? await resUser.json()
               : { notifications: [] };
            let combined: Notification[] = userJson.notifications || [];

            // Also fetch any notifications where meta includes this user id (fallback)
            try {
               const resMeta = await fetch(`/api/notifications?limit=200`);
               if (resMeta.ok) {
                  const metaJson = await resMeta.json();
                  const metaFiltered = (metaJson.notifications || []).filter(
                     (n: any) => {
                        try {
                           const meta =
                              typeof n.meta === "string"
                                 ? JSON.parse(n.meta)
                                 : n.meta || {};
                           return (
                              meta &&
                              (String(meta.user_id) === String(user.id) ||
                                 String(meta.recipient_user_id) ===
                                    String(user.id))
                           );
                        } catch (e) {
                           return false;
                        }
                     }
                  );
                  combined = [...metaFiltered, ...combined];
               }
            } catch (e) {
               // ignore
            }

            // fetch role-based notifications: admin
            if (hasRole && hasRole("admin")) {
               const resAdmin = await fetch(
                  `/api/notifications?role=admin&limit=100`
               );
               if (resAdmin.ok) {
                  const adminJson = await resAdmin.json();
                  combined = [...(adminJson.notifications || []), ...combined];
               }
            }

            // fetch rider role notifications (fallback), filter by riderId if available
            // fetch rider mapping for this user to include rider-role fallback notifications
            let foundRiderId: string | null = null;
            try {
               const rider = await fetchRiderByUserId(user.id);
               if (rider && rider.id) {
                  foundRiderId = rider.id;
                  if (!riderId) setRiderId(rider.id);
               }
            } catch (err) {
               // ignore
            }

            if (foundRiderId) {
               const resRider = await fetch(
                  `/api/notifications?role=rider&limit=200`
               );
               if (resRider.ok) {
                  const riderJson = await resRider.json();
                  const riderFiltered = (riderJson.notifications || []).filter(
                     (n: any) => {
                        try {
                           const meta =
                              typeof n.meta === "string"
                                 ? JSON.parse(n.meta)
                                 : n.meta || {};
                           return (
                              meta &&
                              meta.rider_id &&
                              String(meta.rider_id) === String(foundRiderId)
                           );
                        } catch (e) {
                           return false;
                        }
                     }
                  );
                  combined = [...riderFiltered, ...combined];
               }
            }

            // dedupe by id and set state
            const seen = new Set();
            const deduped = combined.filter((x: any) => {
               if (!x || !x.id) return false;
               if (seen.has(x.id)) return false;
               seen.add(x.id);
               return true;
            });
            setNotifications((prev) => [...deduped, ...prev].slice(0, 200));
         } catch (err) {
            console.error("fetchPersisted notifications err", err);
         }
      };

      const setupRealtime = () => {
         // subscribe to notifications INSERT and UPDATE events and filter client-side
         notificationsChannel = supabase
            .channel(`public:notifications:user:${user.id}`)
            .on(
               "postgres_changes",
               {
                  event: "INSERT",
                  schema: "public",
                  table: "notifications",
               },
               (payload) => handleRealtimeRow(payload.new)
            )
            .on(
               "postgres_changes",
               {
                  event: "UPDATE",
                  schema: "public",
                  table: "notifications",
               },
               (payload) => handleRealtimeRow(payload.new)
            )
            .subscribe();
      };

      const handleRealtimeRow = (row: any) => {
         const recipientUser = row.recipient_user_id;
         const recipientRole = row.recipient_role;

         const isForUser =
            recipientUser && String(recipientUser) === String(user.id);
         const isForAdmin =
            recipientRole === "admin" && hasRole && hasRole("admin");

         let isForRiderFallback = false;
         if (recipientRole === "rider") {
            try {
               const meta =
                  typeof row.meta === "string"
                     ? JSON.parse(row.meta)
                     : row.meta || {};
               if (
                  meta &&
                  meta.rider_id &&
                  riderId &&
                  String(meta.rider_id) === String(riderId)
               )
                  isForRiderFallback = true;
            } catch (e) {
               // ignore parse error
            }
         }

         if (!(isForUser || isForAdmin || isForRiderFallback)) return;

         const normalized: Notification = {
            id: row.id,
            title: row.title,
            body: row.body,
            meta: row.meta,
            created_at: row.created_at,
            read: row.read,
            type:
               (row.type as string) ||
               (() => {
                  try {
                     const meta =
                        typeof row.meta === "string"
                           ? JSON.parse(row.meta)
                           : row.meta || {};
                     return meta?.type || meta?.event || undefined;
                  } catch (e) {
                     return undefined;
                  }
               })(),
         };

         setNotifications((prev) => {
            // replace existing if present, otherwise add to front
            const idx = prev.findIndex((p) => p.id === normalized.id);
            if (idx >= 0) {
               const copy = prev.slice();
               copy[idx] = normalized;
               return copy;
            }
            return [normalized, ...prev].slice(0, 200);
         });

         // show small toast for real-time arrival
         toast.message(
            normalized.title + (normalized.body ? ` — ${normalized.body}` : "")
         );
      };

      fetchPersisted();
      setupRealtime();

      return () => {
         try {
            if (notificationsChannel)
               supabase.removeChannel(notificationsChannel);
         } catch (err) {
            try {
               notificationsChannel?.unsubscribe?.();
            } catch {}
         }
      };
   }, [user?.id, hasRole, riderId]);

   const addNotification = (n: Notification) =>
      setNotifications((prev) => [n, ...prev].slice(0, 100));

   const markAsRead = async (id: string) => {
      try {
         // Call mark-read API
         const res = await fetch(`/api/notifications/mark-read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [id] }),
         });
         if (!res.ok) throw new Error("Failed to mark as read");
         setNotifications((prev) =>
            prev.map((p) => (p.id === id ? { ...p, read: true } : p))
         );
      } catch (err) {
         console.error("markAsRead err", err);
         // still mark locally for UX
         setNotifications((prev) =>
            prev.map((p) => (p.id === id ? { ...p, read: true } : p))
         );
      }
   };

   const clear = () => setNotifications([]);

   return (
      <NotificationsContext.Provider
         value={{ notifications, addNotification, markAsRead, clear }}
      >
         {children}
      </NotificationsContext.Provider>
   );
};

export default NotificationsContext;

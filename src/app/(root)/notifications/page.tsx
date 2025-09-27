"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/contexts/NotificationsContext";

const page = () => {
  const { user, loading } = useAuth();
  const { notifications, markAsRead, clear } = useNotifications();
  const [localNotifications, setLocalNotifications] = useState<any[]>([]);

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Your recent notifications
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    // mark all unread notifications as read via API
                    const ids = notifications
                      .filter((n) => !n.read)
                      .map((n) => n.id);
                    if (ids.length === 0) return;
                    await fetch(`/api/notifications/mark-read`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ ids }),
                    });
                    // optimistic update
                    setLocalNotifications((prev) =>
                      prev.map((p) => ({
                        ...p,
                        read: true,
                      }))
                    );
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocalNotifications([])}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="divide-y max-h-96 overflow-auto">
            {localNotifications.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No notifications
              </div>
            )}
            {localNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 hover:bg-surface-secondary flex items-start justify-between gap-4 ${
                  n.read ? "opacity-60" : ""
                }`}
              >
                <div>
                  <div className="text-sm font-semibold">{n.title}</div>
                  {n.body && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {n.body}
                    </div>
                  )}
                  <div className="text-xxs text-muted-foreground mt-2">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {!n.read && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await fetch(`/api/notifications/mark-read`, {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              ids: [n.id],
                            }),
                          });
                          setLocalNotifications((prev) =>
                            prev.map((p) =>
                              p.id === n.id ? { ...p, read: true } : p
                            )
                          );
                        } catch (e) {
                          console.error(e);
                          setLocalNotifications((prev) =>
                            prev.map((p) =>
                              p.id === n.id ? { ...p, read: true } : p
                            )
                          );
                        }
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setLocalNotifications((prev) =>
                        prev.filter((p) => p.id !== n.id)
                      )
                    }
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default page;

"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { fetchRiderByUserId } from "@/integrations/supabase/riders";
import { useRiderAssignments, useRespondToAssignment } from "@/hooks/useRiders";

const RiderAssignmentsPage = () => {
   const { user, isLoggedIn } = useAuth();
   const [riderId, setRiderId] = useState<string | null>(null);
   const [loadingRider, setLoadingRider] = useState(false);
   const respond = useRespondToAssignment();

   useEffect(() => {
      if (!user) return;
      (async () => {
         setLoadingRider(true);
         try {
            const r = await fetchRiderByUserId(user.id);
            setRiderId(r?.id || null);
         } catch (err) {
            console.error("Failed to fetch rider for user", err);
         } finally {
            setLoadingRider(false);
         }
      })();
   }, [user]);

   const { data: assignments, isLoading } = useRiderAssignments(
      riderId || undefined
   );

   const handleRespond = async (
      assignmentId: string,
      status: "accepted" | "rejected" | "completed"
   ) => {
      try {
         await respond.mutateAsync({ assignmentId, status });
         alert(`Assignment ${status}`);
      } catch (err: any) {
         console.error(err);
         alert(err?.message || "Failed to respond");
      }
   };

   if (!isLoggedIn)
      return <div className="p-6">Please sign in to view assignments.</div>;
   if (loadingRider) return <div className="p-6">Loading rider...</div>;
   if (!riderId)
      return (
         <div className="p-6">No rider profile found for your account.</div>
      );

   return (
      <div className="p-6">
         <h1 className="text-2xl font-bold mb-4">
            {t("rider.assignmentsTitle")}
         </h1>
         {isLoading ? (
            <div>Loading assignments...</div>
         ) : (
            <div className="space-y-4">
               {(assignments || []).length === 0 && <div>No assignments</div>}
               {(assignments || []).map((a: any) => (
                  <div
                     key={a.id}
                     className="p-4 border rounded"
                  >
                     <div className="flex justify-between">
                        <div>
                           <div className="font-semibold">
                              Order #{a.order_id}
                           </div>
                           <div className="text-sm text-gray-600">
                              {t("rider.status")}:{" "}
                              {t(`rider.status.${a.status}`) || a.status}
                           </div>
                           <div className="text-sm text-gray-600">
                              Assigned:{" "}
                              {new Date(a.assigned_at).toLocaleString()}
                           </div>
                        </div>
                        <div className="flex flex-col gap-2">
                           {a.status === "assigned" && (
                              <>
                                 <button
                                    onClick={() =>
                                       handleRespond(a.id, "accepted")
                                    }
                                    className="px-3 py-1 bg-green-600 text-white rounded"
                                 >
                                    {t("rider.action.accept")}
                                 </button>
                                 <button
                                    onClick={() =>
                                       handleRespond(a.id, "rejected")
                                    }
                                    className="px-3 py-1 bg-red-500 text-white rounded"
                                 >
                                    {t("rider.action.reject")}
                                 </button>
                              </>
                           )}
                           {a.status === "accepted" && (
                              <button
                                 onClick={() =>
                                    handleRespond(a.id, "completed")
                                 }
                                 className="px-3 py-1 bg-blue-600 text-white rounded"
                              >
                                 {t("rider.action.markCompleted")}
                              </button>
                           )}
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>
   );
};

export default RiderAssignmentsPage;

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
   fetchUserOrders,
   fetchAllOrders,
   fetchOrderById,
   createOrder,
   updateOrderStatus,
   deleteOrder,
   getOrderStats,
   type Order,
   type OrderQueryOptions,
   type CreateOrderRequest,
   type OrderStatus,
} from "@/integrations/supabase/orders";

// Query Keys
export const orderKeys = {
   all: ["orders"] as const,
   lists: () => [...orderKeys.all, "list"] as const,
   list: (options: OrderQueryOptions) =>
      [...orderKeys.lists(), options] as const,
   details: () => [...orderKeys.all, "detail"] as const,
   detail: (id: string) => [...orderKeys.details(), id] as const,
   stats: () => [...orderKeys.all, "stats"] as const,
   userOrders: (userId: string) => [...orderKeys.all, "user", userId] as const,
};

// Hook for fetching user's orders
export function useUserOrders(options: OrderQueryOptions = {}) {
   const { user, isLoggedIn } = useAuth();

   console.log("useUserOrders hook:", { user, isLoggedIn, options });

   return useQuery({
      queryKey: orderKeys.userOrders(user?.id || ""),
      queryFn: () => fetchUserOrders(options, user?.id),
      enabled: isLoggedIn && !!user,
      staleTime: 1000 * 60 * 5, // 5 minutes
   });
}

// Hook for fetching all orders (admin only)
export function useAllOrders(options: OrderQueryOptions = {}) {
   const { user, hasRole } = useAuth();

   return useQuery({
      queryKey: orderKeys.list(options),
      queryFn: () => {
         console.log("Executing fetchAllOrders with options:", options);
         return fetchAllOrders(options);
      },
      enabled: !!user && hasRole("admin"),
      staleTime: 0, // Disable stale time to always refetch
   });
}

// Hook for fetching single order
export function useOrder(id: string) {
   const { user, isLoggedIn } = useAuth();

   return useQuery({
      queryKey: orderKeys.detail(id),
      queryFn: () => fetchOrderById(id),
      enabled: isLoggedIn && !!user && !!id,
   });
}

// Hook for order statistics (admin only)
export function useOrderStats() {
   const { user, hasRole } = useAuth();

   return useQuery({
      queryKey: orderKeys.stats(),
      queryFn: getOrderStats,
      enabled: !!user && hasRole("admin"),
      staleTime: 1000 * 60 * 5, // 5 minutes
   });
}

// Hook for creating orders
export function useCreateOrder() {
   const queryClient = useQueryClient();
   const { user } = useAuth();

   return useMutation<Order, Error, CreateOrderRequest>({
      mutationFn: async (orderData: CreateOrderRequest) => {
         console.log("Regular Order Mutation - Starting with data:", orderData);
         if (!orderData.order || !orderData.items) {
            console.error("Invalid order data:", orderData);
            throw new Error("Invalid order data structure");
         }
         try {
            const result = await createOrder(orderData);
            if (!result) {
               throw new Error("No response received from server");
            }
            console.log("Regular Order Mutation - Success:", result);
            return result;
         } catch (error) {
            console.error("Regular Order Mutation - Error:", error);
            throw error instanceof Error
               ? error
               : new Error("Unknown error occurred");
         }
      },
      onMutate: (variables) => {
         console.log("Regular Order Mutation - onMutate:", variables);
      },
      onSuccess: (data) => {
         console.log("Regular Order Mutation - onSuccess:", data);
         queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
         if (data?.id) {
            queryClient.setQueryData(orderKeys.detail(data.id), data);
         }
         if (user) {
            queryClient.invalidateQueries({
               queryKey: orderKeys.userOrders(user.id),
            });
         }
      },
      onError: (error: Error) => {
         console.error("Regular Order Mutation - onError:", error);
         toast.error(error.message || "Failed to create order");
      },
      onSettled: (data, error, variables) => {
         console.log("Regular Order Mutation - onSettled:", {
            data,
            error,
            variables,
         });
      },
   });
}

// Hook for updating order status
export function useUpdateOrderStatus() {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: ({
         id,
         status,
         additionalFields,
      }: {
         id: string;
         status: OrderStatus;
         additionalFields?: Partial<Order>;
      }) => updateOrderStatus(id, status, additionalFields),
      onSuccess: (updatedOrder) => {
         // Update the specific order in cache
         queryClient.setQueryData(
            orderKeys.detail(updatedOrder.id),
            updatedOrder
         );

         // Invalidate order lists to refetch
         queryClient.invalidateQueries({ queryKey: orderKeys.lists() });

         // Invalidate stats if admin
         queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      },
      onError: (error) => {
         console.error("Failed to update order status:", error);
      },
   });
}

// Hook for deleting orders (admin only)
export function useDeleteOrder() {
   const queryClient = useQueryClient();

   return useMutation({
      mutationFn: (id: string) => deleteOrder(id),
      onSuccess: (_, deletedId) => {
         // Remove from cache
         queryClient.removeQueries({ queryKey: orderKeys.detail(deletedId) });

         // Invalidate lists
         queryClient.invalidateQueries({ queryKey: orderKeys.lists() });

         // Invalidate stats
         queryClient.invalidateQueries({ queryKey: orderKeys.stats() });
      },
      onError: (error) => {
         console.error("Failed to delete order:", error);
      },
   });
}

// Main hook that provides all order-related functionality
export function useOrders() {
   const { user, isLoggedIn, hasRole } = useAuth();
   const queryClient = useQueryClient();

   const isAdmin = hasRole("admin");

   return {
      // Query hooks
      useUserOrders: (options?: OrderQueryOptions) =>
         useUserOrders(options || {}),
      useAllOrders: (options?: OrderQueryOptions) =>
         useAllOrders(options || {}),
      useOrder: (id: string) => useOrder(id),
      useOrderStats: () => useOrderStats(),

      // Mutation hooks
      createOrder: useCreateOrder(),
      updateOrderStatus: useUpdateOrderStatus(),
      deleteOrder: useDeleteOrder(),

      // Utility functions
      invalidateOrders: () => {
         queryClient.invalidateQueries({ queryKey: orderKeys.all });
      },

      prefetchOrder: (id: string) => {
         return queryClient.prefetchQuery({
            queryKey: orderKeys.detail(id),
            queryFn: () => fetchOrderById(id),
            staleTime: 1000 * 60 * 5,
         });
      },

      // User state
      user,
      isLoggedIn,
      isAdmin,
   };
}

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Address } from "@/types/addresses";
import { useAuth } from "./useAuth";

export interface AddressSuggestion {
   display_name: string;
   lat: string;
   lon: string;
   address: any;
}

export function useAddresses() {
   const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
   const [addresses, setAddresses] = useState<Address[]>([]);
   const [selected, setSelected] = useState<Address | null>(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [lastQuery, setLastQuery] = useState<string>("");
   const { user } = useAuth();

   const fetchAddresses = useCallback(async () => {
      if (!user) return;

      try {
         setLoading(true);
         const { data, error } = await createClient()
            .from("addresses")
            .select("*")
            .eq("user_id", user.id)
            .order("is_default", { ascending: false });

         if (error) throw error;
         setAddresses(data || []);

         // Select the default address if none is selected
         if (!selected && data && data.length > 0) {
            const defaultAddr = data.find((addr: Address) => addr.is_default);
            if (defaultAddr) setSelected(defaultAddr);
         }
      } catch (err) {
         setError(
            err instanceof Error ? err.message : "Error fetching addresses"
         );
      } finally {
         setLoading(false);
      }
   }, [user, selected]);

   useEffect(() => {
      fetchAddresses();
   }, [fetchAddresses]);

   const searchAddresses = useCallback(
      async (q: string) => {
         if (!q || q.trim().length < 2) return [];
         if (q === lastQuery) return suggestions;

         setLastQuery(q);
         try {
            const res = await fetch(
               `/api/addresses?q=${encodeURIComponent(q)}`
            );

            if (!res.ok) {
               const error = await res.json();
               throw new Error(error.error || "Failed to fetch addresses");
            }

            const data = await res.json();
            if (Array.isArray(data)) {
               const mapped = data.map((d) => ({
                  display_name: d.display_name,
                  lat: d.lat,
                  lon: d.lon,
                  address: d.address,
               }));
               setSuggestions(mapped);
               return mapped;
            } else {
               throw new Error("Invalid response format");
            }
         } catch (e) {
            console.error("Address search failed:", e);
            setSuggestions([]);
            throw e;
         }
      },
      [lastQuery, suggestions]
   );

   const saveAddress = async (
      addressData: AddressSuggestion & {
         street?: string;
         house_number?: string;
         phone?: string;
         is_default?: boolean;
      }
   ) => {
      if (!user) return null;

      // Helper to add a timeout to promises so UI doesn't hang forever
      const withTimeout = <T>(p: Promise<T>, ms = 10000): Promise<T> => {
         let timer: NodeJS.Timeout;
         return Promise.race([
            p,
            new Promise<T>((_, reject) => {
               timer = setTimeout(() => {
                  reject(new Error(`Request timed out after ${ms}ms`));
               }, ms);
            }),
         ]).finally(() => clearTimeout(timer));
      };

      try {
         console.log("Saving address with data:", addressData);
         setLoading(true);
         const supabase = createClient();

         // Wrap the insert call with a timeout to avoid indefinite hangs.
         const insertPromise = new Promise<any>(async (resolve, reject) => {
            try {
               const res = await supabase
                  .from("addresses")
                  .insert([
                     {
                        user_id: user.id,
                        display_name: addressData.display_name,
                        street: addressData.street,
                        house_number: addressData.house_number,
                        phone: addressData.phone,
                        city:
                           addressData.address?.city ||
                           addressData.address?.town,
                        lat: addressData.lat,
                        lon: addressData.lon,
                        is_default: addressData.is_default,
                     },
                  ])
                  .select()
                  .single();

               resolve(res);
            } catch (e) {
               reject(e);
            }
         });

         let data: any = null;
         let error: any = null;
         try {
            const res = await withTimeout(insertPromise, 12000);
            // Supabase response shape may be { data, error } or the client may
            // return the record directly depending on wrapper; normalize it.
            if (res && typeof res === "object" && "data" in res) {
               data = (res as any).data;
               error = (res as any).error;
            } else {
               // Some supabase clients return the row directly when using .single()
               data = res;
            }
         } catch (e) {
            console.error("Insert request failed or timed out:", e);
            throw e;
         }

         console.log("Save result:", { data, error });

         if (error) throw error;

         if (!data) {
            throw new Error("No address returned from insert");
         }

         setAddresses((prev) => [...prev, data]);
         if (data.is_default) setSelected(data);
         return data;
      } catch (err) {
         console.error("saveAddress error:", err);
         setError(err instanceof Error ? err.message : "Error adding address");
         return null;
      } finally {
         setLoading(false);
      }
   };

   const updateAddress = async (id: string, updates: Partial<Address>) => {
      if (!user) return null;

      try {
         setLoading(true);
         const { data, error } = await createClient()
            .from("addresses")
            .update(updates)
            .eq("id", id)
            .eq("user_id", user.id)
            .select()
            .single();

         if (error) throw error;

         setAddresses((prev) =>
            prev.map((addr) => (addr.id === id ? data : addr))
         );
         if (selected?.id === id) setSelected(data);
         return data;
      } catch (err) {
         setError(
            err instanceof Error ? err.message : "Error updating address"
         );
         return null;
      } finally {
         setLoading(false);
      }
   };

   const removeAddress = async (id: string) => {
      if (!user) return false;

      try {
         setLoading(true);
         const { error } = await createClient()
            .from("addresses")
            .delete()
            .eq("id", id)
            .eq("user_id", user.id);

         if (error) throw error;

         setAddresses((prev) => prev.filter((addr) => addr.id !== id));
         if (selected?.id === id) setSelected(null);
         return true;
      } catch (err) {
         setError(
            err instanceof Error ? err.message : "Error deleting address"
         );
         return false;
      } finally {
         setLoading(false);
      }
   };

   const setDefaultAddress = async (id: string) => {
      if (!user) return null;

      try {
         setLoading(true);
         const { data, error } = await createClient().rpc(
            "set_default_address",
            { p_address_id: id }
         );

         if (error) throw error;

         // Refresh addresses to get updated state
         await fetchAddresses();
         return true;
      } catch (err) {
         setError(
            err instanceof Error ? err.message : "Error setting default address"
         );
         return null;
      } finally {
         setLoading(false);
      }
   };

   const selectAddress = (id: string | null) => {
      if (!id) return setSelected(null);
      const found = addresses.find((a) => a.id === id) || null;
      setSelected(found);
   };

   return {
      suggestions,
      addresses,
      saved: addresses, // for backward compatibility
      selected,
      loading,
      error,
      searchAddresses,
      saveAddress,
      updateAddress,
      removeAddress,
      setDefaultAddress,
      selectAddress,
      refresh: fetchAddresses,
      reloadSaved: fetchAddresses, // for backward compatibility
   };
}

export default useAddresses;

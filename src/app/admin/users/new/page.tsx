"use client";
import { FC } from "react";

interface pageProps {}

import { useState } from "react";

const page: FC<pageProps> = ({}) => {
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [fullName, setFullName] = useState("");
   const [phone, setPhone] = useState("");
   const [role, setRole] = useState<"admin" | "user">("user");
   const [message, setMessage] = useState("");
   const [error, setError] = useState("");
   const [loading, setLoading] = useState(false);

   const handleCreateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");
      setMessage("");
      const res = await fetch("/api/admin/create-user", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ email, password, fullName, phone, role }),
      });
      const data = await res.json();
      if (res.ok) {
         setMessage("User created successfully!");
         setEmail("");
         setPassword("");
         setFullName("");
         setPhone("");
      } else {
         setError(data.error || "Failed to create user");
      }
      setLoading(false);
   };

   return (
      <div className="max-w-md mx-auto py-10">
         <h2 className="text-2xl font-bold mb-4">Create New User</h2>
         <form
            onSubmit={handleCreateUser}
            className="space-y-4"
         >
            <div>
               <label className="block mb-1">Email</label>
               <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
               />
            </div>
            <div>
               <label className="block mb-1">Password</label>
               <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
               />
            </div>
            <div>
               <label className="block mb-1">Full Name</label>
               <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full border rounded px-3 py-2"
               />
            </div>
            <div>
               <label className="block mb-1">Phone</label>
               <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border rounded px-3 py-2"
               />
            </div>
            <div>
               <label className="block mb-1">Role</label>
               <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as "admin" | "user")}
                  className="w-full border rounded px-3 py-2"
               >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
               </select>
            </div>
            <button
               type="submit"
               className="bg-blue-600 text-white px-4 py-2 rounded"
               disabled={loading}
            >
               {loading ? "Creating..." : "Create User"}
            </button>
         </form>
         {message && <div className="mt-4 text-green-600">{message}</div>}
         {error && <div className="mt-4 text-red-600">{error}</div>}
      </div>
   );
};

export default page;

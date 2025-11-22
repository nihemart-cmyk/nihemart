import React from "react";

export const ThankYou: React.FC<{ message?: string }> = ({ message }) => {
   return (
      <div className="min-h-[60vh] flex items-center justify-center">
         <div className="max-w-2xl text-center p-8 bg-white rounded-lg shadow">
            <h1 className="text-2xl font-bold mb-4">
               Thank you for ordering from Nihemart
            </h1>
            <p className="text-sm text-gray-600">
               {message ||
                  "Your order has been received. We'll be in touch with delivery details shortly."}
            </p>
         </div>
      </div>
   );
};

export default ThankYou;

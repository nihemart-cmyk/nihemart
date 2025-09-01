import { FC } from "react";

interface pageProps {}

const page: FC<pageProps> = ({}) => {
  return (
    <div className="p-5">
      <h1 className="font-bold text-3xl">Add External Purchase</h1>
      <p className="text-gray-500">Track orders list across your store.</p>
      <form action="" className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 lg:mr-16 lg:pr-8">
        <div className="flex flex-col gap-2">
          <label htmlFor="">Product Name:</label>
          <input type="text" placeholder="Enter product name" className="w-full border border-gray text-gray-400 rounded-lg p-2" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="">Price:</label>
          <input type="number" placeholder="RWF 0" className="w-full border border-gray text-gray-400 rounded-lg p-2" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="">Purchase Date:</label>
          <input type="datetime" name="" placeholder="MM/DD/YY" id="" className="w-full border border-gray text-gray-400 rounded-lg p-2" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="">Quantity:</label>
          <input type="number" placeholder="RWF 0" className="w-full border border-gray text-gray-400 rounded-lg p-2" />
        </div>
        <button className="bg-orange-500 text-white p-2 rounded-lg text-center w-1/4 hover:bg-orange-400 transition-all duration-200">Save</button>
      </form>
    </div>
  );
};

export default page;

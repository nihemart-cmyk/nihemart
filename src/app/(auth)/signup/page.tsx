import Image from "next/image";
import { FC } from "react";
import logo from "@/assets/logo.png";
import AdminSignupForm from "@/components/auth/admin/AdminSignupForm";

interface pageProps {}

const page: FC<pageProps> = ({}) => {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left Side (Always Visible) */}
      <div className="w-full lg:flex-[0.5] px-5 sm:px-10 flex items-center justify-center">
        <div className="w-full max-w-md sm:max-w-lg mx-auto">
          <div className="w-full relative flex items-center justify-center">
            <div
              className="mt-5"
              // style={{
              //   background:
              //     "radial-gradient(circle,rgba(54, 169, 236, 0) 10%, rgba(255, 255, 255, 1) 60%)",
              // }}
            ></div>
            {/* <Image
              src={"/Pattern.png"}
              alt="pattern"
              fill
              className="object-cover"
            /> */}
            <Image
              src={logo}
              alt="logo"
              priority
              height={100}
              width={100}
              className="m-auto"
            />
          </div>
          <AdminSignupForm />
        </div>
      </div>

      {/* Right Side (Hidden on Mobile/Tablet) */}
      <div className="hidden lg:flex h-screen sticky top-0 p-1 flex-[0.5]">
        <div
          className="w-full h-full bg-brand-orange rounded-3xl flex flex-col justify-end overflow-hidden"
          style={{ backgroundImage: "url(/bg-Illustration1.png)" }}
        >
          <h2 className="px-5 py-4 text-white text-5xl lg:text-7xl font-bold text-center">
            Nihemart
          </h2>
          <Image
            src={"/auth-page-girl.png"}
            alt="auth page girl"
            width={1000}
            height={1200}
            className="w-full h-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default page;

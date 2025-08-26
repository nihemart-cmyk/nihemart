import Image from 'next/image'
import { FC } from 'react'
import logo from '@/assets/logo.png';
import AdminSigninForm from '@/components/auth/admin/AdminSigninForm';

interface pageProps {

}

const page: FC<pageProps> = ({ }) => {
    return <div className='flex min-h-screen'>
        <div className="w-full flex-[0.5] px-10">
            <div className="max-w-screen-sm mx-auto">
                <div className="w-full relative h-60 flex items-center justify-center">
                    <div className="absolute z-10 inset-0" style={{ background: "radial-gradient(circle,rgba(54, 169, 236, 0) 10%, rgba(255, 255, 255, 1) 60%)" }}></div>
                    <Image src={'/Pattern.png'} alt='pattern' fill />
                    <Image src={logo} alt="ilead logo" priority height={50} width={200} className='mt-10' />
                </div>
                <AdminSigninForm />
            </div>
        </div>
        <div className="h-screen sticky top-0 p-1 flex-[0.5]">
            <div className="w-full h-full bg-brand-orange rounded-3xl flex flex-col justify-end" style={{ backgroundImage: 'url(/bg-Illustration1.png)' }}>
                <h2 className='px-5 text-white text-7xl font-bold text-center'>Nihemart Dashboard</h2>
                <Image src={'/auth-page-girl.png'} alt='auth page girl' width={1000} height={1200} className='w-full' />
            </div>
        </div>
    </div>
}

export default page
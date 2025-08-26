'use client';

import { FC, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AdminSigninSchema, TAdminSigninSchema } from '@/lib/validators/admin-auth';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface AdminSigninFormProps {}

const AdminSigninForm: FC<AdminSigninFormProps> = ({}) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const form = useForm<TAdminSigninSchema>({
    resolver: zodResolver(AdminSigninSchema),
    defaultValues: {
      email: "admin@nihemart.com",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: TAdminSigninSchema) => {
    // In a real app, you would make an API call here.
    // We'll simulate a network delay.
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Form Submitted Data:', data);
    // You can add toast notifications for success/error here.
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-none border-0 mt-7">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">Welcome Back !</CardTitle>
        <p className="text-muted-foreground">Admin</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-zinc-500'>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input placeholder="admin@nihemart.com" {...field} className="pl-10 border-gray-400 placeholder:text-gray-400 h-12 rounded-xl" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-zinc-500'>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        {...field}
                        className="pl-10 pr-10 border-gray-400 placeholder:text-gray-400 h-12 rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center justify-between">
                <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel className='text-zinc-500'>Remember me</FormLabel>
                            </div>
                        </FormItem>
                    )}
                />
                <Link href="#" className="text-sm text-blue-500 hover:underline">
                    Forgot Password?
                </Link>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white" 
              size="lg"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AdminSigninForm;
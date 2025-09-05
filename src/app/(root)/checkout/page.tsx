"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { Loader2, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  variation_id?: string;
  variation_name?: string;
}

const Checkout = () => {
  const { t } = useLanguage();
  const { user, isLoggedIn } = useAuth();
  const { createOrder } = useOrders();
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    phone: ''
  });
  const [orderItems, setOrderItems] = useState<CartItem[]>([]);
  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load cart and user data
  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          // Clean up cart items to ensure valid UUIDs
          const cleanedCart = parsedCart.map(item => ({
            ...item,
            id: item.id.replace(/-$/, ''), // Remove trailing dash if exists
            variation_id: item.variation_id?.replace(/-$/, '') || undefined // Clean variation_id too
          }));
          setOrderItems(cleanedCart);
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        toast.error("Failed to load cart items");
      }
    }

    // Pre-fill user data if logged in
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email || '',
        firstName: user.user_metadata?.full_name?.split(' ')[0] || '',
        lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || ''
      }));
    }
  }, [user]);

  // Redirect if cart is empty
  useEffect(() => {
    if (orderItems.length === 0) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [orderItems.length, router]);

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const transport = 1000; // Fixed transport cost
  const total = subtotal + transport;

  // Form validation
  const validateForm = () => {
    const formErrors: any = {};
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

    if (!formData.firstName.trim()) formErrors.firstName = t('checkout.errors.firstNameRequired');
    if (!formData.lastName.trim()) formErrors.lastName = t('checkout.errors.lastNameRequired');
    if (!formData.email.trim() || !emailPattern.test(formData.email)) {
      formErrors.email = t('checkout.errors.validEmailRequired');
    }
    if (!formData.address.trim()) formErrors.address = t('checkout.errors.addressRequired');
    if (!formData.city.trim()) formErrors.city = t('checkout.errors.cityRequired');

    return formErrors;
  };

  // Handle order creation
  const handleCreateOrder = async () => {
    // Prevent multiple submissions
    if (isSubmitting) return;

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    if (!isLoggedIn) {
      toast.error("Please log in to place an order");
      router.push('/auth/login?redirect=/checkout');
      return;
    }

    if (orderItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const orderData = {
        order: {
          user_id: user!.id,
          subtotal: subtotal,
          tax: transport,
          total: total,
          customer_email: formData.email.trim(),
          customer_first_name: formData.firstName.trim(),
          customer_last_name: formData.lastName.trim(),
          customer_phone: formData.phone.trim() || undefined,
          delivery_address: formData.address.trim(),
          delivery_city: formData.city.trim(),
          status: 'pending' as const
        },
        items: orderItems.map(item => ({
          product_id: item.id,
          product_variation_id: item.variation_id || null, // Ensure null instead of undefined
          product_name: item.name,
          product_sku: item.sku || null, // Ensure null instead of undefined
          variation_name: item.variation_name || null, // Ensure null instead of undefined
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity
        }))
      };

      console.log('Order data being sent:', JSON.stringify(orderData, null, 2));

      const createdOrder = await createOrder.mutateAsync(orderData);
      
      // Clear cart only after successful order creation
      localStorage.removeItem('cart');
      setOrderItems([]); // Clear local state too

      toast.success(`Order #${createdOrder.order_number} has been created successfully!`);

      // Redirect to order details page
      router.push(`/orders/${createdOrder.id}`);
      
    } catch (error: any) {
      console.error('Order creation failed:', error);
      
      // More specific error handling
      if (error?.message?.includes('uuid')) {
        toast.error("Invalid product data. Please refresh and try again.");
      } else if (error?.message?.includes('foreign key')) {
        toast.error("Product no longer available. Please update your cart.");
      } else {
        toast.error(`Failed to create order: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to generate the WhatsApp message (fallback)
  const generateWhatsAppMessage = () => {
    const productDetails = orderItems.map(item => 
      `${item.name}${item.variation_name ? ` (${item.variation_name})` : ''} x${item.quantity} - ${(item.price * item.quantity).toLocaleString()} RWF`
    ).join('\n');

    const message = `
*New Order Request*

*Customer Details:*
Name: ${formData.firstName} ${formData.lastName}
Email: ${formData.email}
Phone: ${formData.phone}
Address: ${formData.address}, ${formData.city}

*Products:*
${productDetails}

*Order Summary:*
Subtotal: ${subtotal.toLocaleString()} RWF
Transport: ${transport.toLocaleString()} RWF
Total: ${total.toLocaleString()} RWF
    `;
    return encodeURIComponent(message);
  };

  const handleWhatsAppCheckout = () => {
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    if (orderItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    const phoneNumber = "250784148374";
    const message = generateWhatsAppMessage();
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, "_blank");
  };

  // Show empty cart message
  if (orderItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <ShoppingCart className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">Add some products to your cart to proceed with checkout.</p>
          <Button onClick={() => router.push('/')}>
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t('checkout.title')}</h1>
      
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('checkout.orderInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">{t('checkout.email')}</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  disabled={isSubmitting}
                />
                {errors.email && <span className="text-red-500 text-sm">{errors.email}</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">{t('checkout.firstName')}</Label>
                  <Input 
                    id="firstName" 
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    disabled={isSubmitting}
                  />
                  {errors.firstName && <span className="text-red-500 text-sm">{errors.firstName}</span>}
                </div>
                <div>
                  <Label htmlFor="lastName">{t('checkout.lastName')}</Label>
                  <Input 
                    id="lastName" 
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    disabled={isSubmitting}
                  />
                  {errors.lastName && <span className="text-red-500 text-sm">{errors.lastName}</span>}
                </div>
              </div>
              <div>
                <Label htmlFor="address">{t('checkout.address')}</Label>
                <Input 
                  id="address" 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  disabled={isSubmitting}
                />
                {errors.address && <span className="text-red-500 text-sm">{errors.address}</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">{t('checkout.city')}</Label>
                  <Input 
                    id="city" 
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    disabled={isSubmitting}
                  />
                  {errors.city && <span className="text-red-500 text-sm">{errors.city}</span>}
                </div>
                <div>
                  <Label htmlFor="phone">{t('checkout.phone')}</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    disabled={isSubmitting}
                    placeholder="+250..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>{t('checkout.orderSummary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderItems.map((item, index) => (
                <div key={`${item.id}-${item.variation_id || 'no-variation'}-${index}`} className="flex justify-between">
                  <span>
                    {item.name}
                    {item.variation_name && (
                      <span className="text-sm text-muted-foreground ml-2">
                        ({item.variation_name})
                      </span>
                    )}
                    <span className="ml-2">x{item.quantity}</span>
                  </span>
                  <span>{(item.price * item.quantity).toLocaleString()} RWF</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between">
                <span>{t('checkout.subtotal')}</span>
                <span>{subtotal.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between">
                <span>{t('checkout.transport')}</span>
                <span>{transport.toLocaleString()} RWF</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>{t('checkout.total')}</span>
                <span>{total.toLocaleString()} RWF</span>
              </div>
              
              <div className="space-y-3">
                {isLoggedIn ? (
                  <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={handleCreateOrder}
                    disabled={isSubmitting || orderItems.length === 0}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing Order...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {t('checkout.placeOrder')}
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                      Please log in to place an order
                    </p>
                    <Button 
                      className="w-full" 
                      size="lg" 
                      onClick={() => router.push('/auth/login?redirect=/checkout')}
                    >
                      Login to Continue
                    </Button>
                  </div>
                )}
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  size="lg" 
                  onClick={handleWhatsAppCheckout}
                  disabled={isSubmitting || orderItems.length === 0}
                >
                  Order via WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
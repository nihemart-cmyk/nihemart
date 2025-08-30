"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';

const Checkout = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    phone: ''
  });
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          setOrderItems(parsedCart);
        }
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const transport = 1000;
  const total = subtotal + transport;

  // Basic form validation
  const validateForm = () => {
    let formErrors: any = {};
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

    // Check required fields
    if (!formData.firstName) formErrors.firstName = 'First Name is required';
    if (!formData.lastName) formErrors.lastName = 'Last Name is required';
    if (!formData.email || !emailPattern.test(formData.email)) formErrors.email = 'Valid Email is required';
    if (!formData.address) formErrors.address = 'Address is required';
    if (!formData.city) formErrors.city = 'City is required';

    return formErrors;
  };

  // Function to generate the WhatsApp message
  const generateWhatsAppMessage = () => {
    const productDetails = orderItems.map(item => 
      `${item.name} x${item.quantity} - ${item.price * item.quantity} RWF`
    ).join('\n');

    const message = `
      *Order Details:*
      Name: ${formData.firstName} ${formData.lastName}
      Email: ${formData.email}
      Phone: ${formData.phone}
      Address: ${formData.address}, ${formData.city}
      
      *Products:*
      ${productDetails}
      
      Subtotal: ${subtotal} RWF
      Tax: ${transport} RWF
      Total: ${total} RWF
    `;
    return encodeURIComponent(message);
  };

  // Function to handle the checkout and open WhatsApp
  const handleCheckout = () => {
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return; // Stop checkout if there are validation errors
    }

    const phoneNumber = "250784148374"; // WhatsApp number to send the message to
    const message = generateWhatsAppMessage();
    const url = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(url, "_blank"); // Open WhatsApp in a new tab
  };

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
                <Input id="email" type="email" value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} />
                {errors.email && <span className="text-red-500 text-sm">{errors.email}</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">{t('checkout.firstName')}</Label>
                  <Input id="firstName" value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                  {errors.firstName && <span className="text-red-500 text-sm">{errors.firstName}</span>}
                </div>
                <div>
                  <Label htmlFor="lastName">{t('checkout.lastName')}</Label>
                  <Input id="lastName" value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                  {errors.lastName && <span className="text-red-500 text-sm">{errors.lastName}</span>}
                </div>
              </div>
              <div>
                <Label htmlFor="address">{t('checkout.address')}</Label>
                <Input id="address" value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})} />
                {errors.address && <span className="text-red-500 text-sm">{errors.address}</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">{t('checkout.city')}</Label>
                  <Input id="city" value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})} />
                  {errors.city && <span className="text-red-500 text-sm">{errors.city}</span>}
                </div>
                <div>
                  <Label htmlFor="phone">{t('checkout.phone')}</Label>
                  <Input id="phone" value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} />
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
              {orderItems.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{(item.price * item.quantity).toLocaleString()} RWF</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between">
                <span>{t('checkout.subtotal')}</span>
                <span>{subtotal.toLocaleString()} RWF</span>
              </div>
              <div className="flex justify-between">
                <span>{t('checkout.tax')}</span>
                <span>{transport.toLocaleString()} RWF</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>{t('checkout.total')}</span>
                <span>{total.toLocaleString()} RWF</span>
              </div>
              <Button className="w-full" size="lg" onClick={handleCheckout}>
                {t('checkout.placeOrder')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
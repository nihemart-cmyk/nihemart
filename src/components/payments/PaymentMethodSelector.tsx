"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PAYMENT_METHODS } from '@/lib/services/kpay';
import { 
  CreditCard, 
  Smartphone, 
  Wallet, 
  Banknote,
  CheckCircle2 
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface PaymentMethodSelectorProps {
  selectedMethod: keyof typeof PAYMENT_METHODS | 'cash_on_delivery';
  onMethodChange: (method: keyof typeof PAYMENT_METHODS | 'cash_on_delivery') => void;
  disabled?: boolean;
  className?: string;
}

const PaymentMethodIcon = ({ method }: { method: keyof typeof PAYMENT_METHODS | 'cash_on_delivery' }) => {
  switch (method) {
    case 'mtn_momo':
    case 'airtel_money':
      return <Smartphone className="h-5 w-5 text-blue-600" />;
    case 'visa_card':
    case 'mastercard':
      return <CreditCard className="h-5 w-5 text-green-600" />;
    case 'spenn':
      return <Wallet className="h-5 w-5 text-purple-600" />;
    case 'cash_on_delivery':
      return <Banknote className="h-5 w-5 text-orange-600" />;
    default:
      return <CheckCircle2 className="h-5 w-5 text-gray-600" />;
  }
};

const getPaymentMethodDetails = (method: keyof typeof PAYMENT_METHODS | 'cash_on_delivery') => {
  if (method === 'cash_on_delivery') {
    return {
      name: 'Cash on Delivery',
      description: 'Pay with cash when your order is delivered',
      badge: 'Traditional',
      badgeColor: 'bg-orange-100 text-orange-800',
    };
  }

  const paymentMethod = PAYMENT_METHODS[method];
  if (!paymentMethod) {
    return {
      name: 'Unknown',
      description: '',
      badge: '',
      badgeColor: '',
    };
  }

  const details = {
    mtn_momo: {
      description: 'Pay using your MTN Mobile Money wallet',
      badge: 'Popular',
      badgeColor: 'bg-yellow-100 text-yellow-800',
    },
    airtel_money: {
      description: 'Pay using your Airtel Money wallet',
      badge: 'Mobile',
      badgeColor: 'bg-red-100 text-red-800',
    },
    visa_card: {
      description: 'Pay securely with your Visa card',
      badge: 'Secure',
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    mastercard: {
      description: 'Pay securely with your MasterCard',
      badge: 'Secure',
      badgeColor: 'bg-blue-100 text-blue-800',
    },
    spenn: {
      description: 'Pay using your SPENN digital wallet',
      badge: 'Digital',
      badgeColor: 'bg-purple-100 text-purple-800',
    },
  };

  return {
    name: paymentMethod.name,
    description: details[method]?.description || '',
    badge: details[method]?.badge || '',
    badgeColor: details[method]?.badgeColor || 'bg-gray-100 text-gray-800',
  };
};

export default function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  disabled = false,
  className = '',
}: PaymentMethodSelectorProps) {
  const { t } = useLanguage();

  const paymentOptions: (keyof typeof PAYMENT_METHODS | 'cash_on_delivery')[] = [
    'mtn_momo',
    'airtel_money',
    'visa_card',
    'mastercard',
    'spenn',
    'cash_on_delivery',
  ];

  return (
    <Card className={`border border-gray-200 shadow-sm ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-orange-600" />
          {t('checkout.paymentMethod') || 'Payment Method'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedMethod}
          onValueChange={onMethodChange}
          disabled={disabled}
          className="space-y-3"
        >
          {paymentOptions.map((method) => {
            const details = getPaymentMethodDetails(method);
            
            return (
              <div key={method} className="relative">
                <Label
                  htmlFor={method}
                  className={`
                    flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${selectedMethod === method 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <RadioGroupItem
                      value={method}
                      id={method}
                      className="border-2 border-gray-300 text-orange-600"
                    />
                    
                    <div className="flex items-center space-x-3">
                      <PaymentMethodIcon method={method} />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900">
                            {details.name}
                          </p>
                          {details.badge && (
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${details.badgeColor} border-none`}
                            >
                              {details.badge}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {details.description}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {selectedMethod === method && (
                    <CheckCircle2 className="h-5 w-5 text-orange-600 ml-2" />
                  )}
                </Label>
              </div>
            );
          })}
        </RadioGroup>

        {/* Payment Security Notice */}
        <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">
                {t('checkout.securePayment') || 'Secure Payment'}
              </p>
              <p className="text-xs leading-relaxed">
                {t('checkout.securePaymentDesc') || 
                 'All online payments are processed securely using industry-standard encryption. Your payment information is never stored on our servers.'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
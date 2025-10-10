"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, AlertCircle, Shield } from 'lucide-react';
import { PAYMENT_METHODS } from '@/lib/services/kpay';

interface CardPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod: 'visa_card' | 'mastercard';
  onConfirm: (cardData: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName: string;
  }) => void;
  initialData?: {
    cardNumber?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cvv?: string;
    cardholderName?: string;
  };
}

export default function CardPaymentDialog({
  isOpen,
  onOpenChange,
  paymentMethod,
  onConfirm,
  initialData = {},
}: CardPaymentDialogProps) {
  const [cardData, setCardData] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCardData({
        cardNumber: initialData.cardNumber || '',
        expiryMonth: initialData.expiryMonth || '',
        expiryYear: initialData.expiryYear || '',
        cvv: initialData.cvv || '',
        cardholderName: initialData.cardholderName || '',
      });
      setErrors({});
    }
  }, [isOpen, initialData]);

  const formatCardNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Add spaces every 4 digits
    const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
    
    // Limit to 19 characters (16 digits + 3 spaces)
    return formatted.substr(0, 19);
  };

  const validateCardNumber = (cardNumber: string): boolean => {
    const digits = cardNumber.replace(/\D/g, '');
    
    if (paymentMethod === 'visa_card') {
      // Visa cards start with 4 and have 16 digits
      return /^4\d{15}$/.test(digits);
    } else if (paymentMethod === 'mastercard') {
      // MasterCard starts with 5 or 2 and has 16 digits
      return /^[52]\d{15}$/.test(digits);
    }
    
    return false;
  };

  const validateExpiry = (month: string, year: string): boolean => {
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (monthNum < 1 || monthNum > 12) return false;
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100; // Last 2 digits
    const currentMonth = currentDate.getMonth() + 1;
    
    if (yearNum < currentYear) return false;
    if (yearNum === currentYear && monthNum < currentMonth) return false;
    
    return true;
  };

  const validateCVV = (cvv: string): boolean => {
    return /^\d{3,4}$/.test(cvv);
  };

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;
    
    if (field === 'cardNumber') {
      processedValue = formatCardNumber(value);
    } else if (field === 'expiryMonth') {
      processedValue = value.replace(/\D/g, '').substr(0, 2);
    } else if (field === 'expiryYear') {
      processedValue = value.replace(/\D/g, '').substr(0, 2);
    } else if (field === 'cvv') {
      processedValue = value.replace(/\D/g, '').substr(0, 4);
    } else if (field === 'cardholderName') {
      processedValue = value.toUpperCase();
    }
    
    setCardData(prev => ({ ...prev, [field]: processedValue }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!cardData.cardNumber.trim()) {
      newErrors.cardNumber = 'Card number is required';
    } else if (!validateCardNumber(cardData.cardNumber)) {
      const cardType = paymentMethod === 'visa_card' ? 'Visa' : 'MasterCard';
      newErrors.cardNumber = `Please enter a valid ${cardType} card number`;
    }
    
    if (!cardData.expiryMonth.trim()) {
      newErrors.expiryMonth = 'Month is required';
    }
    
    if (!cardData.expiryYear.trim()) {
      newErrors.expiryYear = 'Year is required';
    }
    
    if (cardData.expiryMonth && cardData.expiryYear && !validateExpiry(cardData.expiryMonth, cardData.expiryYear)) {
      newErrors.expiry = 'Card has expired or invalid date';
    }
    
    if (!cardData.cvv.trim()) {
      newErrors.cvv = 'CVV is required';
    } else if (!validateCVV(cardData.cvv)) {
      newErrors.cvv = 'CVV must be 3-4 digits';
    }
    
    if (!cardData.cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (validateForm()) {
      onConfirm(cardData);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const getCardInfo = () => {
    const method = PAYMENT_METHODS[paymentMethod];
    return {
      name: method.name,
      color: paymentMethod === 'visa_card' ? 'text-blue-600' : 'text-red-600',
      bgColor: paymentMethod === 'visa_card' ? 'bg-blue-50' : 'bg-red-50',
      borderColor: paymentMethod === 'visa_card' ? 'border-blue-200' : 'border-red-200',
    };
  };

  const cardInfo = getCardInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className={`h-5 w-5 ${cardInfo.color}`} />
            {cardInfo.name} Payment
          </DialogTitle>
          <DialogDescription>
            Please enter your {cardInfo.name} details to complete the payment.
            Your information is encrypted and secure.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Card Number */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber" className="text-sm font-medium">
              Card Number
            </Label>
            <div className="relative">
              <Input
                id="cardNumber"
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardData.cardNumber}
                onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                className={errors.cardNumber ? 'border-red-500 focus-visible:ring-red-500' : ''}
                maxLength={19}
              />
              <CreditCard className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            {errors.cardNumber && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.cardNumber}
              </div>
            )}
          </div>

          {/* Expiry and CVV */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryMonth" className="text-sm font-medium">
                Month
              </Label>
              <Input
                id="expiryMonth"
                type="text"
                placeholder="MM"
                value={cardData.expiryMonth}
                onChange={(e) => handleInputChange('expiryMonth', e.target.value)}
                className={errors.expiryMonth || errors.expiry ? 'border-red-500 focus-visible:ring-red-500' : ''}
                maxLength={2}
              />
              {errors.expiryMonth && (
                <div className="text-xs text-red-600">{errors.expiryMonth}</div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expiryYear" className="text-sm font-medium">
                Year
              </Label>
              <Input
                id="expiryYear"
                type="text"
                placeholder="YY"
                value={cardData.expiryYear}
                onChange={(e) => handleInputChange('expiryYear', e.target.value)}
                className={errors.expiryYear || errors.expiry ? 'border-red-500 focus-visible:ring-red-500' : ''}
                maxLength={2}
              />
              {errors.expiryYear && (
                <div className="text-xs text-red-600">{errors.expiryYear}</div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cvv" className="text-sm font-medium">
                CVV
              </Label>
              <Input
                id="cvv"
                type="text"
                placeholder="123"
                value={cardData.cvv}
                onChange={(e) => handleInputChange('cvv', e.target.value)}
                className={errors.cvv ? 'border-red-500 focus-visible:ring-red-500' : ''}
                maxLength={4}
              />
              {errors.cvv && (
                <div className="text-xs text-red-600">{errors.cvv}</div>
              )}
            </div>
          </div>
          
          {errors.expiry && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {errors.expiry}
            </div>
          )}

          {/* Cardholder Name */}
          <div className="space-y-2">
            <Label htmlFor="cardholderName" className="text-sm font-medium">
              Cardholder Name
            </Label>
            <Input
              id="cardholderName"
              type="text"
              placeholder="JOHN DOE"
              value={cardData.cardholderName}
              onChange={(e) => handleInputChange('cardholderName', e.target.value)}
              className={errors.cardholderName ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {errors.cardholderName && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.cardholderName}
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className={`${cardInfo.bgColor} border ${cardInfo.borderColor} rounded-lg p-3`}>
            <div className="flex items-start gap-2">
              <Shield className={`h-4 w-4 ${cardInfo.color} mt-0.5 flex-shrink-0`} />
              <div className={`text-sm ${cardInfo.color}`}>
                <p className="font-medium mb-1">Secure Payment</p>
                <p className="text-xs leading-relaxed">
                  Your card details are encrypted using industry-standard SSL technology.
                  We never store your complete card information on our servers.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!cardData.cardNumber.trim() || !cardData.cardholderName.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Continue Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
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
import { Smartphone, AlertCircle } from 'lucide-react';
import { PAYMENT_METHODS } from '@/lib/services/kpay';

interface MobileMoneyPhoneDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod: 'mtn_momo' | 'airtel_money';
  onConfirm: (phoneNumber: string) => void;
  initialPhone?: string;
}

export default function MobileMoneyPhoneDialog({
  isOpen,
  onOpenChange,
  paymentMethod,
  onConfirm,
  initialPhone = '',
}: MobileMoneyPhoneDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');

  // Reset phone number when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPhoneNumber(initialPhone);
      setError('');
    }
  }, [isOpen, initialPhone]);

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If already in 07XXXXXXXX format, return as is (preferred by KPay)
    if (/^07\d{8}$/.test(cleaned)) {
      return cleaned;
    }
    
    // If starts with +250, convert to 07XXXXXXXX
    if (cleaned.startsWith('+250')) {
      const digits = cleaned.substring(4);
      if (digits.length === 9 && digits.startsWith('7')) {
        return `0${digits}`;
      }
    }
    
    // If starts with 250, convert to 07XXXXXXXX
    if (cleaned.startsWith('250')) {
      const digits = cleaned.substring(3);
      if (digits.length === 9 && digits.startsWith('7')) {
        return `0${digits}`;
      }
    }
    
    // If 9 digits starting with 7, add 0 prefix
    if (cleaned.length === 9 && cleaned.startsWith('7')) {
      return `0${cleaned}`;
    }
    
    return cleaned;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const formatted = formatPhoneNumber(phone);
    
    // Check if it's a valid Rwanda mobile number format (07XXXXXXXX)
    const rwandaMobileRegex = /^07[0-9]{8}$/;
    return rwandaMobileRegex.test(formatted);
  };

  const validateMobileOperator = (phone: string): boolean => {
    const formatted = formatPhoneNumber(phone);
    
    if (paymentMethod === 'mtn_momo') {
      // MTN numbers start with 078, 077, 076, 079
      return /^0(78|77|76|79)[0-9]{7}$/.test(formatted);
    } else if (paymentMethod === 'airtel_money') {
      // Airtel numbers start with 073, 072, 070
      return /^0(73|72|70)[0-9]{7}$/.test(formatted);
    }
    
    return false;
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    setError('');
  };

  const handleConfirm = () => {
    const trimmedPhone = phoneNumber.trim();
    
    if (!trimmedPhone) {
      setError('Phone number is required');
      return;
    }

    if (!validatePhoneNumber(trimmedPhone)) {
      setError('Please enter a valid Rwanda mobile number (e.g., 0781234567)');
      return;
    }

    if (!validateMobileOperator(trimmedPhone)) {
      const operatorName = paymentMethod === 'mtn_momo' ? 'MTN' : 'Airtel';
      const prefixes = paymentMethod === 'mtn_momo' ? '078, 077, 076, 079' : '073, 072, 070';
      setError(`Please enter a valid ${operatorName} number. ${operatorName} numbers start with: ${prefixes}`);
      return;
    }

    const formattedPhone = formatPhoneNumber(trimmedPhone);
    onConfirm(formattedPhone);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const getPaymentMethodInfo = () => {
    const method = PAYMENT_METHODS[paymentMethod];
    return {
      name: method.name,
      prefixes: paymentMethod === 'mtn_momo' 
        ? ['078', '077', '076', '079'] 
        : ['073', '072', '070'],
      color: paymentMethod === 'mtn_momo' ? 'text-yellow-600' : 'text-red-600',
    };
  };

  const methodInfo = getPaymentMethodInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className={`h-5 w-5 ${methodInfo.color}`} />
            {methodInfo.name} Payment
          </DialogTitle>
          <DialogDescription>
            Please enter your {methodInfo.name} phone number to complete the payment.
            You will receive an SMS prompt to authorize the transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder={methodInfo.name === 'MTN Mobile Money' ? '0780000000' : '0730000000'}
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
              autoFocus
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Smartphone className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">
                  {methodInfo.name} Number Format
                </p>
                <p className="text-xs leading-relaxed">
                  {methodInfo.name} numbers in Rwanda start with: {methodInfo.prefixes.join(', ')}
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
            disabled={!phoneNumber.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Continue Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
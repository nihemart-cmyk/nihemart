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
import { Smartphone, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  // Reset phone number when dialog opens
  useEffect(() => {
    if (isOpen) {
      const formatted = formatPhoneForDisplay(initialPhone);
      setPhoneDisplay(formatted);
      setPhoneValue(initialPhone);
      setError('');
      validatePhone(initialPhone);
    }
  }, [isOpen, initialPhone]);

  const formatPhoneForDisplay = (input: string): string => {
    const cleaned = input.replace(/[^\d]/g, '');
    
    // Format as 078 123 4567
    if (cleaned.startsWith('07')) {
      const digits = cleaned;
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
    }
    
    return cleaned;
  };

  const normalizePhoneValue = (raw: string): string => {
    const digits = raw.replace(/[^\d]/g, '');
    
    // Return in 07XXXXXXXX format (10 digits)
    if (digits.startsWith('07') && digits.length <= 10) {
      return digits;
    }
    
    return digits;
  };

  const validateMobileOperator = (phone: string): { valid: boolean; message?: string } => {
    const cleaned = phone.replace(/[^\d]/g, '');
    
    if (cleaned.length !== 10) {
      return { valid: false, message: 'Phone number must be 10 digits' };
    }

    if (!cleaned.startsWith('07')) {
      return { valid: false, message: 'Phone number must start with 07' };
    }
    
    if (paymentMethod === 'mtn_momo') {
      // MTN numbers start with 078, 077, 076, 079
      if (/^0(78|77|76|79)/.test(cleaned)) {
        return { valid: true };
      }
      return { 
        valid: false, 
        message: 'Please enter a valid MTN number (078, 077, 076, or 079)' 
      };
    } else if (paymentMethod === 'airtel_money') {
      // Airtel numbers start with 073, 072, 070
      if (/^0(73|72|70)/.test(cleaned)) {
        return { valid: true };
      }
      return { 
        valid: false, 
        message: 'Please enter a valid Airtel number (073, 072, or 070)' 
      };
    }
    
    return { valid: false };
  };

  const validatePhone = (phone: string) => {
    const validation = validateMobileOperator(phone);
    setIsValid(validation.valid);
    return validation;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatPhoneForDisplay(input);
    const normalized = normalizePhoneValue(input);

    // Enforce max length of 10 digits
    if (normalized.length <= 10) {
      setPhoneDisplay(formatted);
      setPhoneValue(normalized);
      setError('');
      
      // Real-time validation feedback
      if (normalized.length === 10) {
        const validation = validatePhone(normalized);
        if (!validation.valid && validation.message) {
          setError(validation.message);
        }
      } else {
        setIsValid(false);
      }
    }
  };

  const handleConfirm = () => {
    const trimmedPhone = phoneValue.trim();
    
    if (!trimmedPhone) {
      setError('Phone number is required');
      return;
    }

    if (trimmedPhone.length !== 10) {
      setError('Please enter a complete 10-digit phone number');
      return;
    }

    const validation = validateMobileOperator(trimmedPhone);
    if (!validation.valid) {
      setError(validation.message || 'Invalid phone number');
      return;
    }

    onConfirm(trimmedPhone);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isValid) {
      handleConfirm();
    }
  };

  const getPaymentMethodInfo = () => {
    const method = PAYMENT_METHODS[paymentMethod];
    return {
      name: method.name,
      prefixes: paymentMethod === 'mtn_momo' 
        ? ['078', '077', '076', '079'] 
        : ['073', '072', '070'],
      color: paymentMethod === 'mtn_momo' ? 'text-yellow-600' : 'text-red-600',
      bgColor: paymentMethod === 'mtn_momo' ? 'bg-yellow-50' : 'bg-red-50',
      borderColor: paymentMethod === 'mtn_momo' ? 'border-yellow-200' : 'border-red-200',
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
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                placeholder={methodInfo.name === 'MTN Mobile Money' ? '078 123 4567' : '073 123 4567'}
                value={phoneDisplay}
                onChange={handlePhoneChange}
                onKeyPress={handleKeyPress}
                className={`pr-10 ${
                  error 
                    ? 'border-red-500 focus-visible:ring-red-500' 
                    : isValid 
                    ? 'border-green-500 focus-visible:ring-green-500' 
                    : ''
                }`}
                autoFocus
                maxLength={12} // 10 digits + 2 spaces
              />
              {isValid && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
              )}
            </div>
            <p className="text-xs text-gray-500">
              {phoneValue.length}/10 digits
            </p>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          <div className={`${methodInfo.bgColor} border ${methodInfo.borderColor} rounded-lg p-3`}>
            <div className="flex items-start gap-2">
              <Smartphone className={`h-4 w-4 ${methodInfo.color} mt-0.5 flex-shrink-0`} />
              <div className="text-sm">
                <p className="font-medium mb-1">
                  {methodInfo.name} Number Format
                </p>
                <p className="text-xs leading-relaxed text-gray-700">
                  {methodInfo.name} numbers in Rwanda start with: <span className="font-semibold">{methodInfo.prefixes.join(', ')}</span>
                </p>
                <p className="text-xs leading-relaxed text-gray-700 mt-1">
                  Example: {methodInfo.prefixes[0]} 123 4567
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
            disabled={!isValid}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
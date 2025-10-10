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
import { Wallet, AlertCircle, Smartphone, Shield } from 'lucide-react';
import { PAYMENT_METHODS } from '@/lib/services/kpay';

interface SpennPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (spennData: {
    phoneNumber: string;
    pin?: string;
  }) => void;
  initialData?: {
    phoneNumber?: string;
    pin?: string;
  };
}

export default function SpennPaymentDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  initialData = {},
}: SpennPaymentDialogProps) {
  const [spennData, setSpennData] = useState({
    phoneNumber: '',
    pin: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSpennData({
        phoneNumber: initialData.phoneNumber || '',
        pin: initialData.pin || '',
      });
      setErrors({});
    }
  }, [isOpen, initialData]);

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If already in 07XXXXXXXX format, return as is
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

  const validatePin = (pin: string): boolean => {
    // SPENN PIN is typically 4-6 digits
    return /^\d{4,6}$/.test(pin);
  };

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;
    
    if (field === 'phoneNumber') {
      processedValue = formatPhoneNumber(value);
    } else if (field === 'pin') {
      processedValue = value.replace(/\D/g, '').substr(0, 6);
    }
    
    setSpennData(prev => ({ ...prev, [field]: processedValue }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!spennData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhoneNumber(spennData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid Rwanda mobile number (e.g., 0781234567)';
    }
    
    // PIN is optional for initial setup - SPENN will handle authentication
    if (spennData.pin && !validatePin(spennData.pin)) {
      newErrors.pin = 'PIN must be 4-6 digits';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (validateForm()) {
      const formattedData = {
        phoneNumber: formatPhoneNumber(spennData.phoneNumber),
        pin: spennData.pin,
      };
      onConfirm(formattedData);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-purple-600" />
            SPENN Payment
          </DialogTitle>
          <DialogDescription>
            Please enter your SPENN account details to complete the payment.
            You'll be redirected to SPENN to authorize the transaction.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-sm font-medium">
              SPENN Phone Number
            </Label>
            <div className="relative">
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="e.g., 0781234567"
                value={spennData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                className={errors.phoneNumber ? 'border-red-500 focus-visible:ring-red-500' : ''}
                autoFocus
              />
              <Smartphone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            {errors.phoneNumber && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.phoneNumber}
              </div>
            )}
          </div>

          {/* Optional PIN Field */}
          <div className="space-y-2">
            <Label htmlFor="pin" className="text-sm font-medium">
              SPENN PIN <span className="text-gray-500 font-normal">(Optional)</span>
            </Label>
            <Input
              id="pin"
              type="password"
              placeholder="Enter your SPENN PIN"
              value={spennData.pin}
              onChange={(e) => handleInputChange('pin', e.target.value)}
              className={errors.pin ? 'border-red-500 focus-visible:ring-red-500' : ''}
              maxLength={6}
            />
            {errors.pin && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.pin}
              </div>
            )}
            <p className="text-xs text-gray-500">
              You can enter your PIN now or authenticate directly in the SPENN app
            </p>
          </div>

          {/* SPENN Information */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Wallet className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-800">
                <p className="font-medium mb-1">About SPENN</p>
                <p className="text-xs leading-relaxed">
                  SPENN is Rwanda's digital wallet that lets you send, receive, and pay for goods and services.
                  You'll be redirected to the SPENN platform to complete your payment.
                </p>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Secure Payment</p>
                <p className="text-xs leading-relaxed">
                  Your SPENN payment is processed securely through encrypted connections.
                  We never store your PIN or sensitive account information.
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
            disabled={!spennData.phoneNumber.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Continue Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
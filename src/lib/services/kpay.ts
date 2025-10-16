/**
 * KPay Payment Gateway Service
 * 
 * This service handles integration with KPay API for processing payments
 * Supports multiple payment methods: Mobile Money (MTN, Airtel), Cards (Visa, MasterCard), SPENN, SmartCash
 */

export interface KPayConfig {
  baseUrl: string;
  username: string;
  password: string;
  retailerId: string;
  environment: 'sandbox' | 'live';
  webhookUrl: string;
}

export interface PaymentRequest {
  action: 'pay';
  msisdn: string;
  email: string;
  details: string;
  refid: string;
  amount: number;
  currency?: string;
  cname: string;
  cnumber: string;
  pmethod: 'momo' | 'cc' | 'spenn' | 'smartcash' | 'bank';
  retailerid: string;
  returl: string;
  redirecturl: string;
  bankid: string;
  logourl?: string;
}

export interface PaymentStatusRequest {
  action: 'checkstatus';
  tid?: string;
  refid?: string;
}

export interface PaymentResponse {
  reply: string;
  url?: string;
  success: number;
  authkey?: string;
  tid: string;
  refid: string;
  retcode: number;
  momtransactionid?: string;
  statusdesc?: string;
  statusid?: string;
}

export interface WebhookPayload {
  tid: string;
  refid: string;
  momtransactionid?: string;
  payaccount?: string;
  statusid: string;
  statusdesc: string;
}

/**
 * Bank codes for different payment methods as per KPay documentation
 */
export const BANK_CODES = {
  // Mobile Money
  MTN_MOMO: '63510',
  AIRTEL_MONEY: '63514',
  // Cards
  VISA_MASTERCARD: '000',
  // Digital Wallets
  SPENN: '63502',
  MOBICASH: '63501',
  // Banks
  BK: '040',
  EQUITY: '192',
  KCB: '160',
  BOA: '900',
  // Add other banks as needed
} as const;

/**
 * Payment method configurations
 */
export const PAYMENT_METHODS = {
  mtn_momo: {
    code: 'momo',
    name: 'MTN Mobile Money',
    bankId: BANK_CODES.MTN_MOMO,
    icon: '📱',
  },
  airtel_money: {
    code: 'momo',
    name: 'Airtel Money',
    bankId: BANK_CODES.AIRTEL_MONEY,
    icon: '📱',
  },
  visa_card: {
    code: 'cc',
    name: 'Visa Card',
    bankId: BANK_CODES.VISA_MASTERCARD,
    icon: '💳',
  },
  mastercard: {
    code: 'cc',
    name: 'MasterCard',
    bankId: BANK_CODES.VISA_MASTERCARD,
    icon: '💳',
  },
  spenn: {
    code: 'spenn',
    name: 'SPENN',
    bankId: BANK_CODES.SPENN,
    icon: '💰',
  },
} as const;

export class KPayService {
  private config: KPayConfig;

  constructor(config: KPayConfig) {
    this.config = config;
  }

  /**
   * Create basic authentication header for KPay API
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Get API endpoint URL based on environment
   */
  private getApiUrl(): string {
    return this.config.environment === 'live' 
      ? process.env.KPAY_LIVE_BASE_URL || 'https://pay.esicia.rw'
      : this.config.baseUrl;
  }

  /**
   * Initiate a payment request
   */
  async initiatePayment(params: {
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerNumber: string;
    paymentMethod: keyof typeof PAYMENT_METHODS;
    orderReference: string;
    orderDetails: string;
    redirectUrl: string;
    logoUrl?: string;
  }): Promise<PaymentResponse> {
    const paymentConfig = PAYMENT_METHODS[params.paymentMethod];
    
    if (!paymentConfig) {
      throw new Error(`Unsupported payment method: ${params.paymentMethod}`);
    }

    const paymentRequest: PaymentRequest = {
      action: 'pay',
      msisdn: params.customerPhone,
      email: params.customerEmail,
      details: params.orderDetails,
      refid: params.orderReference,
      amount: params.amount,
      currency: 'RWF',
      cname: params.customerName,
      cnumber: params.customerNumber,
      pmethod: paymentConfig.code,
      retailerid: this.config.retailerId,
      returl: this.config.webhookUrl,
      redirecturl: params.redirectUrl,
      bankid: paymentConfig.bankId,
      logourl: params.logoUrl,
    };

    // Debug log the exact request being sent to KPay
    console.log('🔍 KPay payment request details:', {
      msisdn: paymentRequest.msisdn,
      bankid: paymentRequest.bankid,
      pmethod: paymentRequest.pmethod,
      amount: paymentRequest.amount,
      refid: paymentRequest.refid,
      customerNumber: paymentRequest.cnumber
    });

    try {
      const response = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader(),
        },
        body: JSON.stringify(paymentRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: PaymentResponse = await response.json();
      
      // Log the payment initiation with detailed request info
      console.log('KPay payment initiated:', {
        refid: params.orderReference,
        paymentMethod: params.paymentMethod,
        bankId: paymentConfig.bankId,
        msisdn: params.customerPhone,
        cnumber: params.customerNumber,
        pmethod: paymentConfig.code,
        tid: result.tid,
        retcode: result.retcode,
        success: result.success,
      });

      return result;
    } catch (error) {
      console.error('KPay payment initiation failed:', error);
      throw new Error('Failed to initiate payment. Please try again.');
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(params: {
    transactionId?: string;
    orderReference?: string;
  }): Promise<PaymentResponse> {
    if (!params.transactionId && !params.orderReference) {
      throw new Error('Either transaction ID or order reference is required');
    }

    const statusRequest: PaymentStatusRequest = {
      action: 'checkstatus',
      tid: params.transactionId,
      refid: params.orderReference,
    };

    try {
      const response = await fetch(this.getApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader(),
        },
        body: JSON.stringify(statusRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: PaymentResponse = await response.json();
      
      console.log('KPay payment status checked:', {
        tid: params.transactionId,
        refid: params.orderReference,
        statusid: result.statusid,
        statusdesc: result.statusdesc,
      });

      return result;
    } catch (error) {
      console.error('KPay payment status check failed:', error);
      throw new Error('Failed to check payment status. Please try again.');
    }
  }

  /**
   * Validate webhook payload
   */
  validateWebhookPayload(payload: any): payload is WebhookPayload {
    return (
      payload &&
      typeof payload.tid === 'string' &&
      typeof payload.refid === 'string' &&
      typeof payload.statusid === 'string' &&
      typeof payload.statusdesc === 'string'
    );
  }

  /**
   * Process webhook notification
   */
  processWebhookPayload(payload: WebhookPayload): {
    isSuccessful: boolean;
    isFailed: boolean;
    isPending: boolean;
    transactionId: string;
    orderReference: string;
    statusMessage: string;
  } {
    const isSuccessful: boolean = payload.statusid === '01';
    
    // Check if payment is pending
    const isPending: boolean = payload.statusid === '02' || 
      (payload.statusid === '03' && Boolean(payload.statusdesc && payload.statusdesc.toLowerCase().includes('pending')));
    
    // Status '03' is failed only if it's not described as pending
    const isFailed: boolean = payload.statusid === '03' && 
      !Boolean(payload.statusdesc && payload.statusdesc.toLowerCase().includes('pending'));

    return {
      isSuccessful,
      isFailed,
      isPending,
      transactionId: payload.tid,
      orderReference: payload.refid,
      statusMessage: payload.statusdesc,
    };
  }

  /**
   * Get error message from return code
   */
  getErrorMessage(retcode: number): string {
    const errorMessages: { [key: number]: string } = {
      0: 'No error. Transaction being processed',
      401: 'Missing authentication header',
      500: 'Non HTTPS request',
      600: 'Invalid username / password combination',
      601: 'Invalid remote user',
      602: 'Location / IP not whitelisted',
      603: 'Empty parameter - missing required parameters',
      604: 'Unknown retailer',
      605: 'Retailer not enabled',
      606: 'Error processing',
      607: 'Failed mobile money transaction',
      608: 'Used ref id – error uniqueness',
      609: 'Unknown Payment method',
      610: 'Unknown or not enabled Financial institution',
      611: 'Transaction not found',
    };

    return errorMessages[retcode] || `Unknown error (code: ${retcode})`;
  }

  /**
   * Format phone number for KPay API (prefers 07XXXXXXXX format)
   */
  static formatPhoneNumber(phone: string): string {
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
  }

  /**
   * Generate unique order reference
   */
  static generateOrderReference(prefix = 'NIHEMART'): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${prefix}_${timestamp}_${random}`;
  }
}

/**
 * Initialize KPay service with environment configuration
 */
export function initializeKPayService(): KPayService {
  const config: KPayConfig = {
    baseUrl: process.env.KPAY_BASE_URL || 'https://pay.esicia.com',
    username: process.env.KPAY_USERNAME || '',
    password: process.env.KPAY_PASSWORD || '',
    retailerId: process.env.KPAY_RETAILER_ID || '',
    environment: (process.env.KPAY_ENVIRONMENT as 'sandbox' | 'live') || 'sandbox',
    webhookUrl: process.env.KPAY_WEBHOOK_URL || 'https://nihemart.rw/api/webhooks/kpay',
  };

  // Validate required configuration
  if (!config.username || !config.password || !config.retailerId) {
    throw new Error('KPay configuration is incomplete. Please check your environment variables.');
  }

  return new KPayService(config);
}
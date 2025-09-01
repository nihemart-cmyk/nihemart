"use client"

import { useState } from 'react';
import { Package, Eye, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

const Orders = () => {
  const { t } = useLanguage();
  
  const orders = [
    {
      id: 'ORD-001',
      date: '2024-01-15',
      status: 'delivered',
      total: 945000,
      items: [
        { name: 'Samsung Galaxy S24', quantity: 1, price: 850000 },
        { name: 'Phone Case', quantity: 1, price: 25000 }
      ],
      deliveryAddress: 'Kigali, Rwanda'
    },
    {
      id: 'ORD-002',
      date: '2024-01-20',
      status: 'processing',
      total: 190000,
      items: [
        { name: 'Nike Air Max 270', quantity: 2, price: 95000 }
      ],
      deliveryAddress: 'Kigali, Rwanda'
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      shipped: 'secondary',
      delivered: 'default'
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-16 py-8">
      <h1 className="text-3xl font-bold mb-8">{t('nav.orders')}</h1>
      
      {orders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-24 w-24 text-muted-foreground mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">No orders yet</h2>
          <p className="text-muted-foreground mb-8">Start shopping to see your orders here!</p>
          <Button>Start Shopping</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(order.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {order.deliveryAddress}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(order.status)}
                    <p className="text-lg font-bold mt-2">{order.total.toLocaleString()} RWF</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-medium">{item.price.toLocaleString()} RWF</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-4">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
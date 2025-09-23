'use client';

import { ShoppingCart, Search, CreditCard, Truck, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const steps = [
  {
    icon: Search,
    title: 'Browse Products',
    description:
      'Use categories, filters, or the search bar to quickly discover items you love.',
  },
  {
    icon: ShoppingCart,
    title: 'Add to Cart',
    description:
      'Click "Add to Cart" to save products. Review or update your cart anytime.',
  },
  {
    icon: Package,
    title: 'Checkout',
    description:
      'Confirm your items, add your shipping details, and proceed with your order.',
  },
  {
    icon: CreditCard,
    title: 'Secure Payment',
    description:
      'Pay using mobile money, credit card, or cash on delivery—whichever suits you best.',
  },
  {
    icon: Truck,
    title: 'Delivery',
    description:
      'Sit back and relax. Your order will arrive quickly at your chosen address.',
  },
];

const HowToBuyPage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-orange-500 to-blue-500 py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6">
            How to Buy
          </h1>
          <p className="text-lg lg:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            Shopping with us is simple, secure, and convenient. Follow these
            steps to place your first order with confidence.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="p-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Step by Step Guide</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From browsing to delivery, here’s everything you need to know to
              complete your purchase smoothly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <Card
                key={i}
                className="bg-white hover:shadow-lg transition-shadow rounded-xl text-center"
              >
                <CardContent className="p-6 flex flex-col items-center">
                  <div className="w-16 h-16 flex items-center justify-center rounded-full bg-orange-500/10 mb-4">
                    <step.icon className="w-8 h-8 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <Separator className="max-w-4xl mx-auto" />

      <section className="p-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">
            Ready to Start Shopping?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Explore thousands of products and enjoy fast, secure checkout with
            multiple payment methods available.
          </p>
          <Button size="lg" className="rounded-full px-8">
            Start Shopping
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HowToBuyPage;

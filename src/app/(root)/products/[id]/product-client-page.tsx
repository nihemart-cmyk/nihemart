"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { Heart, Star, Minus, Plus, Truck, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { ProductPageData, ProductVariationDetail } from "@/integrations/supabase/store"
import { useCart } from "@/contexts/CartContext"
import { cn } from "@/lib/utils"

interface ProductClientPageProps {
  initialData: ProductPageData;
}

export default function ProductClientPage({ initialData }: ProductClientPageProps) {
  const { addItem } = useCart();
  const [data] = useState<ProductPageData>(initialData);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState<ProductVariationDetail | null>(
    data.variations.length > 0 ? data.variations[0] : null
  );
  const [quantity, setQuantity] = useState(1);

  const { product, variations, images, reviews, similarProducts } = data;

  const uniqueColors = useMemo(() => {
    if (!variations) return [];
    const colors = variations.map(v => v.attributes?.color).filter(Boolean);
    return [...new Set(colors)];
  }, [variations]);

  const uniqueSizes = useMemo(() => {
    if (!variations) return [];
    const sizes = variations.map(v => v.attributes?.size).filter(Boolean);
    return [...new Set(sizes)];
  }, [variations]);

  const handleVariantSelect = (type: 'color' | 'size', value: string) => {
    const currentAttributes = selectedVariation?.attributes || {};
    const newAttributes = { ...currentAttributes, [type]: value };
    const bestMatch = variations?.find(v => 
      (!newAttributes.color || v.attributes?.color === newAttributes.color) &&
      (!newAttributes.size || v.attributes?.size === newAttributes.size)
    ) || null;
    setSelectedVariation(bestMatch);
  };
  
  const displayImages = useMemo(() => {
    if (!images) return [];
    return images.map(img => img.url);
  }, [images]);

  const handleAddToCart = () => {
    const itemToAdd = {
      product_id: product.id,
      name: product.name,
      price: selectedVariation?.price || product.price,
      image: product.main_image_url || '/placeholder.svg',
      variant: selectedVariation?.name || undefined,
      id: selectedVariation?.id ? `${product.id}-${selectedVariation.id}` : product.id,
    };
    for (let i = 0; i < quantity; i++) {
        addItem(itemToAdd);
    }
  };

  const reviewStats = useMemo(() => {
    if (!reviews || reviews.length === 0) return { average: 0, distribution: [] };
    const total = reviews.reduce((acc, r) => acc + r.rating, 0);
    const distribution = Array(5).fill(0).map((_, i) => {
        const star = 5 - i;
        const count = reviews.filter(r => r.rating === star).length;
        return { stars: star, percentage: (count / reviews.length) * 100 };
    });
    return { average: total / reviews.length, distribution };
  }, [reviews]);
  
  const currentPrice = selectedVariation?.price ?? product.price;
  const comparePrice = product.compare_at_price;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-lg overflow-hidden">
              <Image src={displayImages[selectedImageIndex] || "/placeholder.svg"} alt={product.name} fill className="object-contain p-4" />
              <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80" onClick={() => setSelectedImageIndex(p => (p - 1 + displayImages.length) % displayImages.length)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80" onClick={() => setSelectedImageIndex(p => (p + 1) % displayImages.length)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="flex gap-2 overflow-x-auto">{displayImages.map((image, index) => <button key={index} onClick={() => setSelectedImageIndex(index)} className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${selectedImageIndex === index ? "border-orange-500" : "border-gray-200"}`}><Image src={image} alt={`Thumbnail ${index + 1}`} width={80} height={80} className="object-cover w-full h-full" /></button>)}</div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div><h1 className="text-3xl font-bold text-gray-900">{product.name}</h1><p className="text-gray-600 mt-1">{product.brand || 'Generic Brand'}</p></div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-orange-600">€{currentPrice.toFixed(2)}</span>{comparePrice && <span className="text-lg text-gray-500 line-through">€{comparePrice.toFixed(2)}</span>}</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center">{[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(reviewStats.average) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}<span className="ml-1 text-sm font-medium">{reviewStats.average.toFixed(1)}</span></div>
                <span className="text-sm text-gray-500">{product.review_count || 0} Reviews</span>
              </div>
            </div>

            {uniqueColors.length > 0 && <div className="space-y-3"><Label className="text-base font-medium">Choose a Color</Label><div className="flex gap-2">{uniqueColors.map(color => <button key={color} onClick={() => handleVariantSelect('color', color!)} className={cn("w-8 h-8 rounded-full border-2 capitalize", selectedVariation?.attributes?.color === color ? "border-orange-500" : "border-gray-300")} style={{backgroundColor: color}} title={color} />)}</div></div>}
            {uniqueSizes.length > 0 && <div className="space-y-3"><Label className="text-base font-medium">Choose a Size</Label><div className="flex gap-2 flex-wrap">{uniqueSizes.map(size => <button key={size} onClick={() => handleVariantSelect('size', size!)} className={cn("px-4 py-2 rounded-lg border text-sm font-medium", selectedVariation?.attributes?.size === size ? "border-orange-500 bg-orange-50 text-orange-600" : "border-gray-300")}>{size}</button>)}</div></div>}
            
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-lg"><Button variant="ghost" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button><span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span><Button variant="ghost" size="icon" onClick={() => setQuantity(q => q + 1)}><Plus className="h-4 w-4" /></Button></div>
              <Button onClick={handleAddToCart} className="flex-1 h-12 text-base font-medium bg-gradient-to-r from-orange-500 to-orange-600 text-white">Add To Cart</Button>
            </div>
            <div className="space-y-3 pt-4 border-t"><div className="flex items-center gap-3"><Truck className="h-5 w-5 text-green-600" /><div><p className="font-medium text-green-600">Free Delivery</p><p className="text-sm text-gray-600">Enter your Postal code for Delivery Availability</p></div></div><div className="flex items-center gap-3"><RotateCcw className="h-5 w-5 text-orange-600" /><div><p className="font-medium text-orange-600">Return Delivery</p><p className="text-sm text-gray-600">Free 30 days Delivery Return. Details</p></div></div></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-16">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md"><TabsTrigger value="description">Description</TabsTrigger><TabsTrigger value="reviews">Reviews ({reviews?.length || 0})</TabsTrigger></TabsList>
            {/* @ts-ignore */}
            <TabsContent value="description" className="mt-8">
                <Card>
                    <CardContent className="p-6 prose max-w-none" dangerouslySetInnerHTML={{ __html: product.description || 'No description available.' }} />
                </Card>
            </TabsContent>
            <TabsContent value="reviews" className="mt-8 space-y-8">
              <Card><CardHeader><CardTitle>Customers Feedback</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="text-center"><div className="text-5xl font-bold text-orange-600 mb-2">{reviewStats.average.toFixed(1)}</div><div className="flex justify-center mb-2">{[...Array(5)].map((_, i) => <Star key={i} className={`h-5 w-5 ${i < Math.round(reviewStats.average) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}</div><p className="text-gray-600">Product Rating</p></div><div className="space-y-2">{reviewStats.distribution.map(item => <div key={item.stars} className="flex items-center gap-2"><div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className={`h-3 w-3 ${i < item.stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}</div><Progress value={item.percentage} className="flex-1 h-2" /><span className="text-sm text-gray-600 w-8">{item.percentage.toFixed(0)}%</span></div>)}</div></div></CardContent></Card>
              <div className="space-y-6"><h3 className="text-xl font-semibold">Reviews</h3>{reviews?.map(review => <Card key={review.id}><CardContent className="p-6"><div className="flex items-start gap-4"><Avatar><AvatarFallback>{review.author?.full_name?.charAt(0) || 'U'}</AvatarFallback></Avatar><div className="flex-1"><div className="flex items-center justify-between mb-2"><h4 className="font-semibold">{review.author?.full_name || 'Anonymous'}</h4><span className="text-sm text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span></div><div className="flex items-center gap-2 mb-2">{[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}</div><h5 className="font-medium mb-2">{review.title}</h5><p className="text-gray-600">{review.content}</p></div></div></CardContent></Card>)}</div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Similar Products */}
        {similarProducts && similarProducts.length > 0 && <div className="mt-16"><h2 className="text-2xl font-bold mb-8">Similar Items You Might Also Like</h2><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{similarProducts.map(p => <Card key={p.id} className="group cursor-pointer"><CardContent className="p-4"><div className="relative aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden"><Image src={p.main_image_url || "/placeholder.svg"} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform" /><Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-white/80"><Heart className="h-4 w-4" /></Button></div><h3 className="font-medium text-sm mb-1 truncate">{p.name}</h3><div className="flex items-center gap-1 mb-2">{[...Array(5)].map((_, i) => <Star key={i} className={`h-3 w-3 ${i < Math.floor(p.average_rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}</div><p className="font-bold text-orange-600">€{p.price.toFixed(2)}</p></CardContent></Card>)}</div></div>}
      </div>
    </div>
  );
}
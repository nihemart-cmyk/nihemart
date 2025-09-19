"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import { Heart, Star, Minus, Plus, Truck, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createStoreReview } from "@/integrations/supabase/store"
import type { ProductPageData, ProductVariationDetail, ProductReview } from "@/integrations/supabase/store"
import { useCart } from "@/contexts/CartContext"
import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import type { User } from "@supabase/supabase-js"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ProductClientPageProps {
  initialData: ProductPageData;
}

export default function ProductClientPage({ initialData }: ProductClientPageProps) {
  const router = useRouter()
  const { addItem } = useCart();
  const [data] = useState<ProductPageData>(initialData);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<ProductReview[]>(data.reviews || []);
  const [user, setUser] = useState<User | null>(null);

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  
  const { product, variations, images, similarProducts } = data;

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getUser();
  }, []);
  
  const uniqueAttributeValues = useMemo(() => {
    const attributes: Record<string, Set<string>> = {};
    variations.forEach(v => {
      Object.entries(v.attributes).forEach(([key, value]) => {
        if (!attributes[key]) attributes[key] = new Set();
        value.split(',').map(s => s.trim()).forEach(val => attributes[key].add(val));
      });
    });
    return Object.fromEntries(Object.entries(attributes).map(([key, valueSet]) => [key, Array.from(valueSet)]));
  }, [variations]);

  const possibleVariants = useMemo(() => {
    if (Object.keys(selectedOptions).length === 0) return variations;
    return variations.filter(variant =>
      Object.entries(selectedOptions).every(([key, value]) =>
        variant.attributes[key]?.split(',').map(s => s.trim()).includes(value)
      )
    );
  }, [selectedOptions, variations]);
  
  const singleSelectedVariation = useMemo(() => {
    if (possibleVariants.length === 1) {
        const finalVariant = possibleVariants[0];
        const userSelectionCount = Object.keys(selectedOptions).length;
        const variantAttributeCount = Object.keys(finalVariant.attributes).length;
        if (userSelectionCount === variantAttributeCount) {
            return finalVariant;
        }
    }
    return null;
  }, [possibleVariants, selectedOptions]);

  const availableOptions = useMemo(() => {
    const available: Record<string, Set<string>> = {};
    Object.keys(uniqueAttributeValues).forEach(key => {
        available[key] = new Set();
        const tempSelection = { ...selectedOptions };
        delete (tempSelection as any)[key];
        
        const potentialVariants = variations.filter(variant =>
            Object.entries(tempSelection).every(([k, v]) =>
                variant.attributes[k]?.split(',').map(s => s.trim()).includes(v as string)
            )
        );
        
        potentialVariants.forEach(variant => {
            variant.attributes[key]?.split(',').map(s => s.trim()).forEach(val => available[key].add(val));
        });
    });
    return available;
  }, [selectedOptions, variations, uniqueAttributeValues]);

  const displayImages = useMemo(() => {
    const allImages = [
      ...images.filter(img => !img.product_variation_id).map(img => img.url),
      ...images.filter(img => img.product_variation_id).map(img => img.url),
    ];
    if (allImages.length > 0) return allImages;
    return product.main_image_url ? [product.main_image_url] : ["/placeholder.svg"];
  }, [images, product.main_image_url]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [displayImages]);

  useEffect(() => {
    if (singleSelectedVariation) {
      const variantImageIndex = displayImages.findIndex(imgUrl => {
        const imageObj = images.find(img => img.url === imgUrl && img.product_variation_id === singleSelectedVariation.id);
        return imageObj !== undefined;
      });
      if (variantImageIndex !== -1) {
        setSelectedImageIndex(variantImageIndex);
      }
    }
  }, [singleSelectedVariation, displayImages, images]);

  const handleOptionSelect = (type: string, value: string) => {
    setSelectedOptions(prev => {
        const newOptions = { ...prev };
        if (newOptions[type] === value) {
            delete newOptions[type];
        } else {
            newOptions[type] = value;
        }
        return newOptions;
    });
  };
  
  const handleAddToCart = () => {
    const hasVariants = variations.length > 0;
    if (hasVariants && !singleSelectedVariation) {
        toast.error("Please select a complete and valid product combination.");
        return;
    }

    const itemToAdd = {
      product_id: product.id,
      name: product.name,
      price: singleSelectedVariation?.price ?? product.price,
      image: product.main_image_url || '/placeholder.svg',
      variant: singleSelectedVariation ? Object.values(singleSelectedVariation.attributes).join(' / ') : undefined,
      id: singleSelectedVariation ? `${product.id}-${singleSelectedVariation.id}` : product.id,
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
  
  const currentPrice = singleSelectedVariation?.price ?? product.price;
  const comparePrice = product.compare_at_price;
  const inStock = variations.length > 0 
    ? (singleSelectedVariation?.stock ?? 0) > 0 
    : (product.stock ?? 0) > 0;

  const isAddToCartDisabled = (variations.length > 0 && !singleSelectedVariation) || !inStock;

  const onReviewSubmitted = (newReview: ProductReview) => {
    setReviews(prev => [newReview, ...prev]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-lg overflow-hidden">
              <Image src={displayImages[selectedImageIndex] || "/placeholder.svg"} alt={product.name} fill className="object-cover p-4" />
              <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80" onClick={() => setSelectedImageIndex(p => (p - 1 + displayImages.length) % displayImages.length)}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80" onClick={() => setSelectedImageIndex(p => (p + 1) % displayImages.length)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">{displayImages.map((image, index) => <button key={index} onClick={() => setSelectedImageIndex(index)} className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${selectedImageIndex === index ? "border-orange-500" : "border-gray-200"}`}><Image src={image} alt={`Thumbnail ${index + 1}`} width={80} height={80} className="object-cover w-full h-full" /></button>)}</div>
          </div>

          <div className="space-y-6">
            <div><h1 className="text-3xl font-bold text-gray-900">{product.name}</h1><p className="text-gray-600 mt-1">{product.brand || 'Generic Brand'}</p></div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-orange-600">€{currentPrice.toFixed(2)}</span>{comparePrice && <span className="text-lg text-gray-500 line-through">€{comparePrice.toFixed(2)}</span>}</div>
              <div className="flex items-center gap-2">
                <div className="flex items-center">{[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(reviewStats.average) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}<span className="ml-1 text-sm font-medium">{reviewStats.average.toFixed(1)}</span></div>
                <span className="text-sm text-gray-500">{reviews?.length || 0} Reviews</span>
              </div>
            </div>

            {Object.entries(uniqueAttributeValues).map(([attr, values]) => (
              <div key={attr} className="space-y-3">
                <Label className="text-base font-medium capitalize">Choose a {attr}</Label>
                <div className="flex gap-2 flex-wrap">
                  {values.map(value => {
                    const isSelected = selectedOptions[attr] === value;
                    const isDisabled = !availableOptions[attr]?.has(value) && !isSelected;
                    return (
                        <button key={value} onClick={() => handleOptionSelect(attr, value)} disabled={isDisabled} className={cn("px-4 py-2 rounded-lg border text-sm font-medium", isSelected ? "border-orange-500 bg-orange-50 text-orange-600" : "border-gray-300", isDisabled && "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400")}>
                        {value}
                        </button>
                    )})}
                </div>
              </div>
            ))}
            
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-lg"><Button variant="ghost" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></Button><span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span><Button variant="ghost" size="icon" onClick={() => setQuantity(q => q + 1)}><Plus className="h-4 w-4" /></Button></div>
              <Button onClick={handleAddToCart} disabled={isAddToCartDisabled} className="flex-1 h-12 text-base font-medium bg-gradient-to-r from-orange-500 to-orange-600 text-white disabled:opacity-50">
                {variations.length > 0 && !singleSelectedVariation ? "Select Options" : !inStock ? "Out of Stock" : "Add To Cart"}
              </Button>
            </div>
            <div className="space-y-3 pt-4 border-t"><div className="flex items-center gap-3"><Truck className="h-5 w-5 text-green-600" /><div><p className="font-medium text-green-600">Free Delivery</p><p className="text-sm text-gray-600">Enter your Postal code for Delivery Availability</p></div></div><div className="flex items-center gap-3"><RotateCcw className="h-5 w-5 text-orange-600" /><div><p className="font-medium text-orange-600">Return Delivery</p><p className="text-sm text-gray-600">Free 30 days Delivery Return. Details</p></div></div></div>
          </div>
        </div>

        <div className="mt-16">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md"><TabsTrigger value="description">Description</TabsTrigger><TabsTrigger value="reviews">Reviews ({reviews?.length || 0})</TabsTrigger></TabsList>
            <TabsContent value="description" className="mt-8"><Card><CardContent className="p-6 prose max-w-none prose-p:my-2 prose-h3:mb-2 prose-h3:mt-4" dangerouslySetInnerHTML={{ __html: product.description || 'No description available.' }} /></Card></TabsContent>
            <TabsContent value="reviews" className="mt-8 space-y-8">
              {reviews.length > 0 && <Card><CardHeader><CardTitle>Customers Feedback</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="text-center"><div className="text-5xl font-bold text-orange-600 mb-2">{reviewStats.average.toFixed(1)}</div><div className="flex justify-center mb-2">{[...Array(5)].map((_, i) => <Star key={i} className={`h-5 w-5 ${i < Math.round(reviewStats.average) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}</div><p className="text-gray-600">Product Rating</p></div><div className="space-y-2">{reviewStats.distribution.map(item => <div key={item.stars} className="flex items-center gap-2"><div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className={`h-3 w-3 ${i < item.stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}</div><Progress value={item.percentage} className="flex-1 h-2" /><span className="text-sm text-gray-600 w-8">{item.percentage.toFixed(0)}%</span></div>)}</div></div></CardContent></Card>}
              <div className="space-y-6"><h3 className="text-xl font-semibold">Customer Reviews</h3>{reviews?.map(review => <Card key={review.id}><CardContent className="p-6"><div className="flex items-start gap-4"><Avatar><AvatarFallback>{review.author?.full_name?.charAt(0) || 'U'}</AvatarFallback></Avatar><div className="flex-1"><div className="flex items-center justify-between mb-2"><h4 className="font-semibold">{review.author?.full_name || 'Anonymous'}</h4><span className="text-sm text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span></div><div className="flex items-center gap-2 mb-2">{[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}</div><h5 className="font-medium mb-2">{review.title}</h5><p className="text-gray-600">{review.content}</p></div></div></CardContent></Card>)}</div>
              
              {user ? (
                <ReviewForm productId={product.id} userId={user.id} onReviewSubmitted={onReviewSubmitted} />
              ) : (
                <Card className="text-center">
                  <CardContent className="p-6">
                    <p>You must be <Link href="/login" className="text-orange-600 underline">logged in</Link> to leave a review.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {similarProducts && similarProducts.length > 0 && <div className="mt-16"><h2 className="text-2xl font-bold mb-8">Similar Items You Might Also Like</h2><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{similarProducts.map(p => <Card key={p.id} className="group cursor-pointer" onClick={() => router.push(`/products/${p.id}`)}><CardContent className="p-4"><div className="relative aspect-square mb-3 bg-gray-100 rounded-lg overflow-hidden"><Image src={p.main_image_url || "/placeholder.svg"} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform" /><Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-white/80"><Heart className="h-4 w-4" /></Button></div><h3 className="font-medium text-sm mb-1 truncate">{p.name}</h3><div className="flex items-center gap-1 mb-2">{[...Array(5)].map((_, i) => <Star key={i} className={`h-3 w-3 ${i < Math.floor(p.average_rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />)}</div><p className="font-bold text-orange-600">€{p.price.toFixed(2)}</p></CardContent></Card>)}</div></div>}
      </div>
    </div>
  );
}

function ReviewForm({ productId, userId, onReviewSubmitted }: { productId: string, userId: string, onReviewSubmitted: (review: ProductReview) => void }) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error("Please select a star rating.");
            return;
        }
        setIsSubmitting(true);
        try {
            const newReview = await createStoreReview({
                product_id: productId,
                user_id: userId,
                rating,
                title,
                content,
            });
            toast.success("Thank you for your review!");
            onReviewSubmitted(newReview);
            setRating(0);
            setTitle('');
            setContent('');
        } catch (error: any) {
            toast.error(error.message || "Failed to submit review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>Write a Review</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label>Your Rating</Label>
                    <div className="flex gap-1 mt-2" onMouseLeave={() => setHoverRating(0)}>
                        {[1, 2, 3, 4, 5].map(star => (
                            <Star 
                                key={star} 
                                className={cn("h-6 w-6 cursor-pointer", (hoverRating || rating) >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300")}
                                onMouseEnter={() => setHoverRating(star)}
                                onClick={() => setRating(star)}
                            />
                        ))}
                    </div>
                </div>
                <div><Label htmlFor="review-title">Review Title</Label><Input id="review-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Great Product!" className="mt-2" /></div>
                <div><Label htmlFor="review-content">Your Review</Label><Textarea id="review-content" value={content} onChange={e => setContent(e.target.value)} placeholder="Tell us what you think..." className="mt-2 min-h-[120px]" /></div>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">{isSubmitting ? "Submitting..." : "Submit Review"}</Button>
            </CardContent>
        </Card>
    );
}
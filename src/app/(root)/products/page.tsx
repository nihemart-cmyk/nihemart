"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { parseAsInteger, parseAsString, parseAsArrayOf } from "nuqs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Heart,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  PackageSearch,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchStoreProducts,
  fetchStoreFilterData,
  fetchStoreSubcategories,
} from "@/integrations/supabase/store";
import type {
  StoreProduct,
  StoreCategory,
  StoreSubcategory,
} from "@/integrations/supabase/store";
import { useDebounce } from "@/hooks/use-debounce";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";
import { WishlistButton } from "@/components/ui/wishlist-button";

const PAGE_LIMIT = 32;

function ProductListingComponent() {
  const router = useRouter();
  const { addItem } = useCart();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [subcategories, setSubcategories] = useState<StoreSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useQueryStates({
    q: parseAsString.withDefault(""),
    page: parseAsInteger.withDefault(1),
    sort: parseAsString.withDefault("created_at.desc"),
    categories: parseAsArrayOf(parseAsString).withDefault([]),
    subcategories: parseAsArrayOf(parseAsString).withDefault([]),
  });

  const debouncedSearchTerm = useDebounce(filters.q, 300);

  const [expandedSections, setExpandedSections] = useState({
    category: true,
    subcategory: true,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [sortColumn, sortDirection] = filters.sort.split(".");
      const { data, count } = await fetchStoreProducts({
        search: debouncedSearchTerm,
        filters: {
          categories: filters.categories,
          subcategories: filters.subcategories,
        },
        sort: {
          column: sortColumn,
          direction: sortDirection as "asc" | "desc",
        },
        pagination: { page: filters.page, limit: PAGE_LIMIT },
      });
      setProducts(data);
      setTotalCount(count);
    } catch (error) {
      console.error("Failed to fetch products", error);
    } finally {
      setLoading(false);
    }
  }, [
    filters.page,
    filters.sort,
    filters.categories,
    filters.subcategories,
    debouncedSearchTerm,
  ]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const { categories } = await fetchStoreFilterData();
        setCategories(categories);
      } catch (error) {
        console.error("Failed to load category data", error);
      }
    };
    loadFilterData();
  }, []);

  useEffect(() => {
    const loadSubcategories = async () => {
      try {
        const { subcategories } = await fetchStoreSubcategories(
          filters.categories
        );
        setSubcategories(subcategories);
      } catch (error) {
        console.error("Failed to load subcategory data", error);
      }
    };
    if (filters.categories.length > 0) {
      loadSubcategories();
    } else {
      setSubcategories([]);
      setFilters({ subcategories: [] });
    }
  }, [filters.categories, setFilters]);

  const handleClearFilters = () => {
    setFilters({
      q: "",
      categories: [],
      subcategories: [],
      page: 1,
    });
  };

  const handleCategoryToggle = (id: string, checked: boolean) => {
    setFilters((prev) => ({
      page: 1,
      categories: checked
        ? [...prev.categories, id]
        : prev.categories.filter((catId) => catId !== id),
    }));
  };

  const handleSubcategoryToggle = (id: string, checked: boolean) => {
    setFilters((prev) => ({
      page: 1,
      subcategories: checked
        ? [...prev.subcategories, id]
        : prev.subcategories.filter((subId) => subId !== id),
    }));
  };

  const handleAddToCart = (e: React.MouseEvent, product: StoreProduct) => {
    e.stopPropagation();
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: product.main_image_url || "/placeholder.svg",
    });
  };

  const renderStars = (rating: number | null) => {
    const r = Math.round(rating || 0);
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={cn("text-sm", i < r ? "text-yellow-400" : "text-gray-300")}
      >
        ★
      </span>
    ));
  };

  const toggleSection = (section: keyof typeof expandedSections) =>
    setExpandedSections((p) => ({ ...p, [section]: !p[section] }));

  const FilterContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Filters</h2>
        <Button
          onClick={handleClearFilters}
          variant="ghost"
          size="sm"
          className="text-orange-500 hover:text-orange-600"
        >
          Clear All
        </Button>
      </div>

      <div>
        <button
          onClick={() => toggleSection("category")}
          className="flex items-center justify-between w-full mb-3"
        >
          <h3 className="font-medium">Category</h3>
          {expandedSections.category ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {expandedSections.category && (
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={c.id}
                    checked={filters.categories.includes(c.id)}
                    onCheckedChange={(checked) =>
                      handleCategoryToggle(c.id, !!checked)
                    }
                  />
                  <label htmlFor={c.id} className="text-sm cursor-pointer">
                    {c.name}
                  </label>
                </div>
                {/* <span className="text-xs text-gray-500">
                  ({c.products_count})
                </span> */}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => toggleSection("subcategory")}
          disabled={filters.categories.length === 0}
          className="flex items-center justify-between w-full mb-3 disabled:opacity-50"
        >
          <h3 className="font-medium">Subcategory</h3>
          {expandedSections.subcategory ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {expandedSections.subcategory && filters.categories.length > 0 && (
          <div className="space-y-2">
            {subcategories.map((sc) => (
              <div key={sc.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={sc.id}
                    checked={filters.subcategories.includes(sc.id)}
                    onCheckedChange={(checked) =>
                      handleSubcategoryToggle(sc.id, !!checked)
                    }
                  />
                  <label htmlFor={sc.id} className="text-sm cursor-pointer">
                    {sc.name}
                  </label>
                </div>
                {/* <span className="text-xs text-gray-500">
                  ({sc.products_count})
                </span> */}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const totalPages = Math.ceil(totalCount / PAGE_LIMIT);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      <div className="container mx-auto px-2 lg:px-4 py-6">
        <div className="flex gap-6">
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 sticky top-28">
              <FilterContent />
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={filters.q}
                    onChange={(e) => setFilters({ q: e.target.value, page: 1 })}
                    className="pl-9 bg-slate-50 border-slate-200"
                  />
                </div>
                <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="lg:hidden bg-transparent"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-full sm:w-96 overflow-y-auto"
                  >
                    <SheetHeader className="mb-6">
                      <SheetTitle>Filter Products</SheetTitle>
                    </SheetHeader>
                    <FilterContent />
                  </SheetContent>
                </Sheet>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600 hidden md:block">
                  <span className="font-medium">{totalCount}</span> Products
                </p>
                <Select
                  value={filters.sort}
                  onValueChange={(value) => setFilters({ sort: value })}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at.desc">Newest</SelectItem>
                    <SelectItem value="price.asc">
                      Price: Low to High
                    </SelectItem>
                    <SelectItem value="price.desc">
                      Price: High to Low
                    </SelectItem>
                    <SelectItem value="average_rating.desc">Rating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!loading && products.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-xl shadow-sm border border-slate-200">
                <PackageSearch className="w-20 h-20 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700">
                  No Products Found
                </h3>
                <p className="text-gray-500 mt-2">
                  Try adjusting your filters or search term.
                </p>
                <Button
                  onClick={handleClearFilters}
                  className="mt-6 bg-orange-500 hover:bg-orange-600"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-5 mb-8">
                {loading
                  ? Array.from({ length: PAGE_LIMIT }).map((_, i) => (
                      <Card
                        key={i}
                        className="animate-pulse bg-gray-200 h-96"
                      ></Card>
                    ))
                  : products.map((product) => (
                      <Card
                        key={product.id}
                        onClick={() => router.push(`/products/${product?.id}`)}
                        className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white border-0 shadow-md cursor-pointer"
                      >
                        <CardContent className="md:p-5 p-2">
                          <div className="relative mb-4">
                            <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-4 aspect-square">
                              <Image
                                src={
                                  product?.main_image_url || "/placeholder.svg"
                                }
                                alt={product?.name}
                                fill
                                className="object-cover rounded-lg"
                              />
                            </div>
                            {/* <div className="absolute top-2 flex justify-between">
                              <span className="inline-block bg-brand-orange text-white text-xs font-bold rounded-full px-2 py-0.5 mr-auto">
                                {product?.price.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                frw
                              </span>
                              <WishlistButton
                                productId={product.id}
                                size="sm"
                                variant="ghost"
                                className="bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 p-2 rounded-full"
                              />
                            </div> */}
                            <div className="absolute z-20 left-3 top-3">
                              {/* <span className="bg-red-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md tracking-widest">
        HOT
      </span> */}
                              <span className="hidden md:inline-block bg-brand-orange text-white text-xs font-bold rounded-full px-2 py-0.5 mr-auto">
                                RWF{" "}
                                {product?.price.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                              </span>
                            </div>
                            {/* Wishlist button */}
                            <div className="absolute z-20 right-3 top-3">
                              <WishlistButton
                                productId={product.id}
                                size="sm"
                                variant="ghost"
                                className="bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="md:hidden font-bold text-orange-500 text-lg">
                              {product?.price.toLocaleString("en-US", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}{" "}
                              frw
                            </p>
                            <h3 className="font-semibold text-gray-900 text-sm md:text-lg truncate">
                              {product?.name}
                            </h3>
                            {/* <p className="text-sm text-gray-900 truncate">
                              {product?.short_description}
                            </p> */}
                            {/* <p className="text-sm text-gray-500">
                              {product?.brand || "Generic"}
                            </p> */}
                            {/* <div className="flex items-center space-x-1">
                              {renderStars(product?.average_rating)}
                              <span className="text-sm text-gray-500 ml-2">
                                ({product?.review_count || 0})
                              </span>
                            </div> */}
                            {/* <p className="md:hidden text-lg md:text-xl font-bold text-gray-900">
                              {product?.price.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              frw
                            </p> */}
                            <div className="flex space-x-2 pt-3">
                              <Button
                                onClick={(e) => handleAddToCart(e, product)}
                                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md hover:shadow-lg transition-all duration-200"
                              >
                                {/* <span className="block md:hidden">
                                  <ShoppingCart className="w-5 h-5" />
                                </span> */}
                                <span className="">
                                  Add To Cart
                                </span>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
              </div>
            )}

            {!loading && totalPages > 1 && (
              <div className="flex justify-center items-center flex-wrap gap-2 bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200">
                <Button
                  onClick={() =>
                    setFilters({ page: Math.max(1, filters.page - 1) })
                  }
                  disabled={filters.page === 1}
                  variant="outline"
                  size="sm"
                  className="hover:bg-orange-50 bg-transparent"
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <Button
                      key={p}
                      onClick={() => setFilters({ page: p })}
                      variant={filters.page === p ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "w-10 h-10",
                        filters.page === p
                          ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                          : "hover:bg-orange-50"
                      )}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button
                  onClick={() =>
                    setFilters({ page: Math.min(totalPages, filters.page + 1) })
                  }
                  disabled={filters.page === totalPages}
                  variant="outline"
                  size="sm"
                  className="hover:bg-orange-50 bg-transparent"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductListingPageContainer() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
          <p>Loading products...</p>
        </div>
      }
    >
      <ProductListingComponent />
    </Suspense>
  );
}

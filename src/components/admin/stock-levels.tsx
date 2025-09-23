'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  History,
  Plus,
  Minus,
  Package
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fetchProductsForStockManagement, fetchStockHistory, updateStockLevel, StockProduct, StockHistoryItem } from '@/integrations/supabase/stock'
import { fetchCategories } from '@/integrations/supabase/products'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'

// Stock update dialog component
function StockUpdateDialog({ product, variation, onClose }: { product: StockProduct, variation: any, onClose: () => void }) {
  const [change, setChange] = useState<number>(0)
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()

  const handleUpdate = async () => {
    if (change === 0 || !reason.trim()) {
      toast.error('Please enter a change amount and reason')
      return
    }

    setIsLoading(true)
    try {
      await updateStockLevel({
        productId: product.id,
        variationId: variation.id,
        change,
        reason: reason.trim()
      })
      toast.success(`Stock ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)} units`)
      queryClient.invalidateQueries({ queryKey: ['products-stock'] })
      onClose()
    } catch (error) {
      toast.error('Failed to update stock')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const quickActions = [
    { label: '+1', value: 1, color: 'bg-green-500 hover:bg-green-600' },
    { label: '+5', value: 5, color: 'bg-green-500 hover:bg-green-600' },
    { label: '+10', value: 10, color: 'bg-green-500 hover:bg-green-600' },
    { label: '-1', value: -1, color: 'bg-red-500 hover:bg-red-600' },
    { label: '-5', value: -5, color: 'bg-red-500 hover:bg-red-600' },
    { label: '-10', value: -10, color: 'bg-red-500 hover:bg-red-600' },
  ]

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Update Stock</DialogTitle>
        <p className="text-sm text-gray-600">{product.name} - {variation.name || 'Default'}</p>
      </DialogHeader>
      <div className="space-y-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Current Stock:</span>
            <span className="text-lg font-bold text-orange-600">{variation.stock}</span>
          </div>
        </div>
        {/* Quick Action Buttons */}
        <div>
          <Label className="text-sm font-medium">Quick Actions</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                size="sm"
                className={`${action.color} text-white border-0`}
                onClick={() => setChange(action.value)}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Manual Input */}
        <div>
          <Label htmlFor="change">Or enter custom amount</Label>
          <Input
            id="change"
            type="number"
            value={change}
            onChange={(e) => setChange(parseInt(e.target.value) || 0)}
            placeholder="e.g., 5 (add) or -3 (subtract)"
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use positive numbers to add stock, negative numbers to reduce stock
          </p>
        </div>

        <div>
          <Label htmlFor="reason">Reason for change</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., New shipment received, Damaged goods, Sold items..."
            rows={3}
            className="mt-1"
          />
        </div>

        {/* Preview */}
        {change !== 0 && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <span>New stock level:</span>
              <span className={`font-bold ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {variation.stock + change} ({change > 0 ? '+' : ''}{change})
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleUpdate}
            disabled={isLoading || change === 0 || !reason.trim()}
            className="bg-orange-500 hover:bg-orange-600 flex-1"
          >
            {isLoading ? 'Updating...' : `Update Stock ${change > 0 ? '(Add)' : '(Reduce)'}`}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </DialogContent>
  )
}

// Stock history dialog component
function StockHistoryDialog({ variationId, onClose }: { variationId: string, onClose: () => void }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['stock-history', variationId],
    queryFn: () => fetchStockHistory(variationId),
    enabled: !!variationId
  })

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Stock History</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {isLoading ? (
          <div>Loading history...</div>
        ) : history && history.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {history.map((item: StockHistoryItem) => (
              <div key={item.id} className="border rounded p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">
                      Change: {item.change > 0 ? '+' : ''}{item.change}
                    </div>
                    <div className="text-sm text-gray-600">
                      New quantity: {item.new_quantity}
                    </div>
                    <div className="text-sm text-gray-600">
                      Reason: {item.reason || 'No reason provided'}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{new Date(item.created_at).toLocaleDateString()}</div>
                    <div>{item.user?.full_name || 'Unknown user'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>No history available</div>
        )}
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </DialogContent>
  )
}

function StockTable({
  title,
  products,
  isLoading,
  onUpdateDialog,
  onHistoryDialog
}: {
  title: string,
  products: StockProduct[],
  isLoading: boolean,
  onUpdateDialog: (dialog: {product: StockProduct, variation: any} | null) => void,
  onHistoryDialog: (variationId: string | null) => void
}) {
  const [selectedItems, setSelectedItems] = useState(new Set<string>())
  const [sortConfig, setSortConfig] = useState<{key: string, direction: string} | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [stockFilter, setStockFilter] = useState('All Stock')
  const [timeFilter, setTimeFilter] = useState('All Time')

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchCategories(),
  })

  const columns = [
    { key: 'checkbox', label: '', width: '40px' },
    { key: 'index', label: '#', width: '60px' },
    { key: 'product', label: 'Product', width: '300px' },
    { key: 'variation', label: 'Variation', width: '150px' },
    { key: 'stock', label: 'Stock', width: '120px' },
    { key: 'price', label: 'Price', width: '120px' },
    { key: 'stockLevel', label: 'Stock Level', width: '100px' },
    { key: 'status', label: 'Status', width: '120px' },
    { key: 'actions', label: 'Actions', width: '150px' }
  ]

  const minTableWidth = columns.reduce((sum, col) => sum + parseInt(col.width), 0) + 'px'

  // Flatten products into product-variation items
  const flattenedData = useMemo(() => {
    const items: any[] = []
    products.forEach(product => {
      product.variations.forEach(variation => {
        console.log({product})
        items.push({
          id: `${product.id}-${variation.id}`,
          productId: product.id,
          variationId: variation.id,
          productName: product.name,
          variationName: variation.name,
          stock: variation.stock,
          price: variation?.price,
          attributes: variation.attributes,
          sku: null,
          barcode: null,
          category: product.category,
          mainImageUrl: product.main_image_url
        })
      })
    })
    return items
  }, [products])

  const uniqueCategories = useMemo(() =>
    ['All Categories', ...categories.map(cat => cat.name)],
    [categories]
  )

  const uniqueStocks = ['All Stock', 'In Stock', 'Low Stock', 'Out of Stock']

  const uniqueTimes = ['All Time', 'This week', 'Previous week', 'This month', 'Last 3 months']

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(flattenedData.map(p => p.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedItems(newSelected)
  }

  const handleSort = (key: string) => {
    if (key === 'checkbox' || key === 'index' || key === 'actions') return
    let direction = 'asc'
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronDown className="h-4 w-4 opacity-50" />
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ChevronDown className="h-4 w-4 text-blue-600" />
    )
  }

  const getSortValue = (item: any, key: string) => {
    const value = item[key]
    if (key === 'price') {
      return parseInt(value.replace(/[^\d]/g, ''), 10)
    }
    if (typeof value === 'string') {
      return value.toLowerCase()
    }
    if (typeof value === 'number') {
      return value
    }
    return value
  }

  const filteredData = useMemo(() => {
    let filtered = [...flattenedData]

    // Search filter
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        p.productName.toLowerCase().includes(lowerSearch) ||
        (p.variationName && p.variationName.toLowerCase().includes(lowerSearch))
      )
    }

    // Category filter
    if (categoryFilter !== 'All Categories') {
      filtered = filtered.filter(p => p.category?.name === categoryFilter)
    }

    // Stock filter
    if (stockFilter !== 'All Stock') {
      if (stockFilter === 'In Stock') {
        filtered = filtered.filter(p => p.stock > 0)
      } else if (stockFilter === 'Low Stock') {
        filtered = filtered.filter(p => p.stock > 0 && p.stock <= 10)
      } else if (stockFilter === 'Out of Stock') {
        filtered = filtered.filter(p => p.stock <= 0)
      }
    }

    // Time filter - placeholder for now (would need update timestamps)
    // if (timeFilter !== 'All Time') {
    //   const now = new Date()
    //   const timeFilters = {
    //     'This week': 7,
    //     'Previous week': 14,
    //     'This month': 30,
    //     'Last 3 months': 90
    //   }
    //   const days = timeFilters[timeFilter as keyof typeof timeFilters]
    //   const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    //   filtered = filtered.filter(p => new Date(p.updatedAt) >= cutoffDate)
    // }

    // Sort
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = getSortValue(a, sortConfig.key)
        const bVal = getSortValue(b, sortConfig.key)

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    return filtered
  }, [flattenedData, searchTerm, categoryFilter, stockFilter, sortConfig])

  return (
    <Card className="bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{filteredData.length}</span>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {timeFilter} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {uniqueTimes.map(time => (
                    <DropdownMenuItem key={time} onClick={() => setTimeFilter(time)}>
                      {time}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {categoryFilter} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {uniqueCategories.map(cat => (
                    <DropdownMenuItem key={cat} onClick={() => setCategoryFilter(cat)}>
                      {cat}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {stockFilter} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {uniqueStocks.map(stock => (
                    <DropdownMenuItem key={stock} onClick={() => setStockFilter(stock)}>
                      {stock}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative overflow-hidden border-t rounded-b-lg">
          <div className="overflow-x-auto">
            <div style={{ minWidth: minTableWidth }}>
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    {columns.map((col) => (
                      <TableHead
                        key={col.key}
                        style={{ minWidth: col.width }}
                        className={cn(
                          'text-gray-500 font-medium sticky top-0 bg-gray-50/90 px-4 py-3 text-left backdrop-blur-sm transition-colors select-none',
                          col.key === 'actions' ? 'text-right' : '',
                          col.key !== 'checkbox' && col.key !== 'actions' && col.key !== 'index' ? 'cursor-pointer hover:bg-gray-100' : '',
                          sortConfig?.key === col.key && 'bg-gray-100 text-gray-900'
                        )}
                        onClick={() => handleSort(col.key)}
                      >
                        {col.key === 'checkbox' ? (
                          <Checkbox
                            checked={selectedItems.size === flattenedData.length && flattenedData.length > 0}
                            onCheckedChange={handleSelectAll}
                            className="rounded border-gray-300"
                          />
                        ) : (
                          <div className={cn('flex items-center gap-2', col.key === 'actions' ? 'justify-end' : '')}>
                            <span className="whitespace-nowrap uppercase text-xs">{col.label}</span>
                            {col.key !== 'checkbox' && col.key !== 'actions' && col.key !== 'index' && getSortIcon(col.key)}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, index) => (
                    <TableRow key={item.id} className="border-b hover:bg-gray-50">
                      <TableCell style={{ minWidth: columns[0].width }} className="border-b border-gray-100 px-4 py-3">
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell style={{ minWidth: columns[1].width }} className="font-medium border-b border-gray-100 px-4 py-3">{index + 1}</TableCell>
                      <TableCell style={{ minWidth: columns[2].width }} className="border-b border-gray-100 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                            {(() => {
                              const product = products.find(p => p.id === item.productId);
                              return product?.main_image_url ? (
                                <Image
                                  src={product.main_image_url}
                                  alt={item.productName}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Package className="w-6 h-6 text-gray-400" />
                              );
                            })()}
                          </div>
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-xs text-gray-500">{item.variationName || 'Default'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell style={{ minWidth: columns[3].width }} className="border-b border-gray-100 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-orange-200 rounded-full"></div>
                          {item.variationName || 'Default'}
                        </div>
                      </TableCell>
                      <TableCell style={{ minWidth: columns[4].width }} className="border-b border-gray-100 px-4 py-3">
                        <Badge
                          variant={item.stock > 0 ? 'default' : 'secondary'}
                          className={item.stock > 0
                            ? 'bg-green-100 text-green-800 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                          }
                        >
                          {item.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ minWidth: columns[5].width }} className="font-medium border-b border-gray-100 px-4 py-3">
                        {item.price ? `RWF ${item?.price?.toLocaleString()}` : 'N/A'}
                      </TableCell>
                      <TableCell style={{ minWidth: columns[6].width }} className="border-b border-gray-100 px-4 py-3">
                        <span className={item.stock <= 10 ? 'text-red-600 font-medium' : ''}>
                          {item.stock}
                        </span>
                      </TableCell>
                      <TableCell style={{ minWidth: columns[7].width }} className="border-b border-gray-100 px-4 py-3">
                        <Badge className={
                          item.stock <= 0 ? 'bg-red-100 text-red-800' :
                          item.stock <= 10 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {item.stock <= 0 ? 'Out of Stock' :
                           item.stock <= 10 ? 'Low Stock' :
                           'In Stock'}
                        </Badge>
                      </TableCell>
                      <TableCell style={{ minWidth: columns[8].width }} className="text-right border-b border-gray-100 px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Update Stock (Add/Reduce)"
                            onClick={() => {
                              const product = products.find(p => p.id === item.productId)
                              const variation = product?.variations.find(v => v.id === item.variationId)
                              if (product && variation) {
                                onUpdateDialog({ product, variation })
                              }
                            }}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          >
                            <div className="flex items-center gap-1">
                              <Plus className="h-3 w-3" />
                              <Minus className="h-3 w-3" />
                            </div>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View History"
                            onClick={() => onHistoryDialog(item.variationId)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function StockLevels() {
  const [updateDialog, setUpdateDialog] = useState<{product: StockProduct, variation: any} | null>(null)
  const [historyDialog, setHistoryDialog] = useState<string | null>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-stock'],
    queryFn: () => fetchProductsForStockManagement(),
  })

  const inStockProducts = products.filter(p =>
    p.variations.some(v => v.stock > 0)
  )

  const outOfStockProducts = products.filter(p =>
    p.variations.every(v => v.stock <= 0)
  )

  return (
    <div className="space-y-6">
      <StockTable
        title="All Products"
        products={products}
        isLoading={isLoading}
        onUpdateDialog={setUpdateDialog}
        onHistoryDialog={setHistoryDialog}
      />

      {/* Dialogs */}
      {updateDialog && (
        <Dialog open={true} onOpenChange={() => setUpdateDialog(null)}>
          <StockUpdateDialog
            product={updateDialog.product}
            variation={updateDialog.variation}
            onClose={() => setUpdateDialog(null)}
          />
        </Dialog>
      )}

      {historyDialog && (
        <Dialog open={true} onOpenChange={() => setHistoryDialog(null)}>
          <StockHistoryDialog
            variationId={historyDialog}
            onClose={() => setHistoryDialog(null)}
          />
        </Dialog>
      )}
    </div>
  )
}
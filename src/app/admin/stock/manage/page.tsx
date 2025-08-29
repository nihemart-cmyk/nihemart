'use client'

import { useState, useEffect } from 'react'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQuill } from 'react-quilljs'
import 'quill/dist/quill.snow.css'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronDown, Upload, HelpCircle, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'

const StockSchema = z.object({
  staff: z.string().min(1, 'Staff is required'),
  search: z.string().optional(),
  productName: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  activity: z.string().min(1, 'Activity is required'),
  quantity: z.string().min(1, 'Quantity is required').regex(/^\d+$/, 'Quantity must be a number'),
})

type StockFormData = z.infer<typeof StockSchema>

interface ProductImage {
  url: string
  file: File
}

export default function NewStockPage() {
  const router = useRouter()
  const [selectedStaff, setSelectedStaff] = useState('Kevin N')
  const [images, setImages] = useState<ProductImage[]>([])
  const { quill, quillRef } = useQuill({
    theme: 'snow',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline'],
        ['image'],
      ],
    },
    formats: ['bold', 'italic', 'underline', 'image'],
    placeholder: 'Enter product description...',
  })

  const form = useForm<StockFormData>({
    resolver: zodResolver(StockSchema),
    defaultValues: {
      staff: 'Kevin N',
      search: 'Coffee Machine',
      productName: 'Coffee Machine',
      description: '',
      sku: '',
      activity: 'Received',
      quantity: '',
    },
  })

  useEffect(() => {
    if (quill) {
      quill.on('text-change', () => {
        form.setValue('description', quill.root.innerHTML, { shouldValidate: true })
      })
    }
  }, [quill, form])

  const insertToEditor = (url: string) => {
    if (quill) {
      const range = quill.getSelection(true)
      quill.insertEmbed(range.index, 'image', url)
      quill.setSelection(range.index + 1, 0)
    }
  }

  const selectLocalImage = () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = () => {
      const file = input.files?.[0]
      if (file) {
        const url = URL.createObjectURL(file)
        insertToEditor(url)
      }
    }
  }

  useEffect(() => {
    if (quill) {
      const toolbar = quill.getModule('toolbar') as { addHandler: (type: string, handler: () => void) => void }
      toolbar.addHandler('image', selectLocalImage)
    }
  }, [quill])

  const onSubmit: SubmitHandler<StockFormData> = async (data) => {
    const fullData = { ...data, image: images[0]?.url }
    console.log('Form Submitted:', fullData)
    // Handle submission, e.g., API call
  }

  const onDrop = (acceptedFiles: File[]) => {
    if (images.length >= 1) return // Limit to one image
    const newImages: ProductImage[] = acceptedFiles.map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }))
    setImages((prev) => [...prev, ...newImages])
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  })

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = prev.filter((_, i) => i !== index)
      URL.revokeObjectURL(prev[index].url)
      return newImages
    })
  }

  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url))
    }
  }, [images])

  return (
    <ScrollArea className="h-screen pb-20">
      <div className="min-h-screen bg-gray-50 p-6">
        <div className=" mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => router.back()}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Stock
              </Button>
              <span className="text-gray-400">/</span>
              <h1 className="text-xl font-semibold text-gray-900">Add New Stock</h1>
            </div>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Confirming...' : 'Confirm'}
            </Button>
          </div>

          <Form {...form}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Form */}
              <div className="lg:col-span-2">
                <Card className="bg-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold">Staff</CardTitle>
                      <HelpCircle className="h-4 w-4 text-gray-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Staff Selection */}
                    <FormField
                      control={form.control}
                      name="staff"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src="/placeholder-avatar.jpg" />
                                      <AvatarFallback className="bg-orange-500 text-white text-xs">KN</AvatarFallback>
                                    </Avatar>
                                    <span>{field.value}</span>
                                    <span className="text-xs text-gray-500">Kevin@domain.com</span>
                                  </div>
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-full">
                                <DropdownMenuItem onClick={() => field.onChange('Kevin N')}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="bg-orange-500 text-white text-xs">KN</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div>Kevin N</div>
                                      <div className="text-xs text-gray-500">Kevin@domain.com</div>
                                    </div>
                                  </div>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Search Product */}
                    <FormField
                      control={form.control}
                      name="search"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="Search product..."
                              {...field}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Product Details Section */}
                    <div className="border-t pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-lg font-semibold">Product Details</h3>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </div>
                      
                      <div className="space-y-4">
                        {/* Product Picture */}
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Product Picture</FormLabel>
                          <div 
                            {...getRootProps()}
                            className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors cursor-pointer"
                          >
                            <input {...getInputProps()} />
                            <div className="space-y-1 text-center">
                              {images.length > 0 ? (
                                <div className="relative w-16 h-16 mx-auto">
                                  <Image
                                    src={images[0].url}
                                    alt="Product"
                                    fill
                                    className="object-cover rounded-lg"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto flex items-center justify-center mb-2">
                                  <Upload className="h-8 w-8 text-gray-400" />
                                </div>
                              )}
                              <div className="flex text-sm text-gray-600">
                                <p>{isDragActive ? 'Drop the image here...' : 'Upload a file or drag and drop'}</p>
                              </div>
                              <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                            </div>
                          </div>
                          {images.length > 0 && (
                            <div className="mt-2 flex justify-center">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeImage(0)}
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                        </FormItem>

                        {/* Product Name */}
                        <FormField
                          control={form.control}
                          name="productName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Product Name</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  className="mt-1"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Product Description */}
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Product Description</FormLabel>
                              <FormControl>
                                <div className="border border-gray-300 rounded-md mt-1">
                                  <div ref={quillRef} className="min-h-[120px] bg-white" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* SKU */}
                        <FormField
                          control={form.control}
                          name="sku"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Sku</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter SKU"
                                  {...field}
                                  className="mt-1"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Activity */}
                        <FormField
                          control={form.control}
                          name="activity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Activity</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select activity" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Received">Received</SelectItem>
                                  <SelectItem value="Shipped">Shipped</SelectItem>
                                  <SelectItem value="Returned">Returned</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Quantity */}
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Quantity</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter quantity"
                                  {...field}
                                  className="mt-1"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* No New Stock Message */}
                <Card className="bg-white text-center py-12">
                  <CardContent>
                    <div className="w-24 h-24 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <div className="w-12 h-12 bg-gray-300 rounded"></div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No New Stock here</h3>
                    <p className="text-sm text-gray-500">
                      Create a new stock by filling the form
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </ScrollArea>
  )
}
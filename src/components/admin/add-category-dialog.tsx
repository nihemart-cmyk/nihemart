'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createCategory, updateCategory } from '@/integrations/supabase/categories';
import { supabase } from '@/integrations/supabase/client';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { Upload, X } from 'lucide-react';
import type { Category } from '@/integrations/supabase/categories';

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters long.'),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface AddEditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  category?: Category | null;
}

const uploadFileToBucket = async (file: File, bucket: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const { error } = await supabase.storage.from(bucket).upload(fileName, file);
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
};

interface SelectedImage {
  url: string;
  file?: File;
  isExisting?: boolean;
}

export default function AddEditCategoryDialog({ open, onOpenChange, onSuccess, category }: AddEditCategoryDialogProps) {
  const isEditMode = !!category;
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (open) {
      if (isEditMode) {
        form.reset({
          name: category.name,
        });
        setSelectedImage(category.icon_url ? { url: category.icon_url, isExisting: true } : null);
      } else {
        form.reset({ name: '' });
        setSelectedImage(null);
      }
    }
  }, [open, category, isEditMode, form]);

  const onDrop = (files: File[]) => {
    if (files[0]) {
      // Revoke previous blob URL if it exists
      if (selectedImage && !selectedImage.isExisting) {
        URL.revokeObjectURL(selectedImage.url);
      }
      const file = files[0];
      const url = URL.createObjectURL(file);
      setSelectedImage({ url, file, isExisting: false });
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  });

  const onSubmit = async (values: CategoryFormData) => {
    try {
      let iconUrl = '';
      if (selectedImage?.file) {
        iconUrl = await uploadFileToBucket(selectedImage.file, 'category-images');
      } else if (selectedImage?.isExisting) {
        iconUrl = selectedImage.url;
      }
      const categoryData = { name: values.name, icon_url: iconUrl };
      if (isEditMode) {
        await updateCategory(category.id, categoryData);
      } else {
        await createCategory(categoryData);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('Failed to save category. Please check if the "category-images" bucket exists and RLS policies allow uploads.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Electronics" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Category Icon</FormLabel>
              <FormControl>
                <div {...getRootProps()} className="flex h-40 w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer">
                  <input {...getInputProps()} />
                  {selectedImage ? (
                    <div className="relative w-32 h-32">
                      <Image src={selectedImage.url} alt="Category icon" fill className="object-cover rounded-md" />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedImage && !selectedImage.isExisting) {
                            URL.revokeObjectURL(selectedImage.url);
                          }
                          setSelectedImage(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">Drop an image here, or click to select</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Category'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
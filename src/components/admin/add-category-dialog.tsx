'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createCategory, updateCategory } from '@/integrations/categories';
import type { Category } from '@/integrations/categories';

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters long.'),
  icon_url: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
  link: z.string().url('Must be a valid URL.').optional().or(z.literal('')),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface AddEditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  category?: Category | null;
}

export default function AddEditCategoryDialog({ open, onOpenChange, onSuccess, category }: AddEditCategoryDialogProps) {
  const isEditMode = !!category;

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', icon_url: '', link: '' },
  });

  useEffect(() => {
    if (open) {
      if (isEditMode) {
        form.reset({
          name: category.name,
          icon_url: category.icon_url || '',
          link: category.link || '',
        });
      } else {
        form.reset({ name: '', icon_url: '', link: '' });
      }
    }
  }, [open, category, isEditMode, form]);

  const onSubmit = async (values: CategoryFormData) => {
    try {
      if (isEditMode) {
        await updateCategory(category.id, values);
      } else {
        await createCategory(values);
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save category:', error);
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
            <FormField
              control={form.control}
              name="icon_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon URL (Optional)</FormLabel>
                  <FormControl><Input placeholder="https://example.com/icon.svg" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link (Optional)</FormLabel>
                  <FormControl><Input placeholder="/categories/electronics" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
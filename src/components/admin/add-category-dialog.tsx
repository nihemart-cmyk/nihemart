'use client';

import * as React from 'react';
import { useQuill } from 'react-quilljs';
import 'quill/dist/quill.snow.css';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddCategoryDialog({ open, onOpenChange }: AddCategoryDialogProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [parentCategory, setParentCategory] = React.useState('');
  const [image, setImage] = React.useState<File | null>(null);

  const { quill, quillRef } = useQuill({
    theme: 'snow',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link'],
      ],
    },
    formats: [
      'bold', 'italic', 'underline', 'list', 'bullet', 'link'
    ],
    placeholder: 'Choose from wide range of smartphones from popular brands.',
  });

  // Sync Quill content with state
  React.useEffect(() => {
    if (quill) {
      quill.on('text-change', () => {
        setDescription(quill.root.innerHTML);
      });
    }
  }, [quill]);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles[0]) {
      setImage(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log({ title, description, parentCategory, image });
    // Reset form
    setTitle('');
    setDescription('');
    setParentCategory('');
    setImage(null);
    if (quill) {
      quill.setContents([]);
    }
    onOpenChange(false);
  };

  const removeImage = () => {
    setImage(null);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={() => onOpenChange(false)}
        style={{ top: -40, left: 0, right: 0, bottom: 0 }}
      />
      
      {/* Side Panel */}
      <div 
        className="fixed top-0 right-1 bottom-1 bg-white shadow-xl z-50 flex flex-col rounded-md w-[95vw] max-w-md lg:w-[40vw] lg:max-w-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Add Category</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div className="space-y-2">
              <div 
                {...getRootProps()}
                className="flex h-40 w-full items-center justify-center rounded-md border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              >
                <input {...getInputProps()} />
                {image ? (
                  <div className="relative h-full w-full">
                    <img
                      src={URL.createObjectURL(image)}
                      alt="Uploaded"
                      className="h-full w-full object-cover rounded"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeImage}
                      className="absolute top-2 right-2 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 text-center text-sm text-gray-500">
                    <Upload className="h-8 w-8" />
                    <div>
                      {isDragActive ? (
                        <p>Drop the image here ...</p>
                      ) : (
                        <>
                          <p>Drag & drop your image here, or</p>
                          <p className="text-blue-600">Click to upload</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Smart Phone"
                required
                className="border-gray-300"
              />
            </div>

            {/* Description with Rich Text Editor */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description (Optional)
              </Label>
              <div className="border border-gray-300 rounded-md">
                <div
                  ref={quillRef}
                  className="min-h-[120px] bg-white [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-gray-200 [&_.ql-container]:border-0 [&_.ql-editor]:text-sm"
                />
              </div>
            </div>

            {/* Parent Category */}
            <div className="space-y-2">
              <Label htmlFor="parent" className="text-sm font-medium">
                Parent Category
              </Label>
              <Select value={parentCategory} onValueChange={setParentCategory}>
                <SelectTrigger id="parent" className="border-gray-300">
                  <SelectValue placeholder="Electronics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Fashion">Fashion</SelectItem>
                  <SelectItem value="Home">Home</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Books">Books</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t p-6">
          <div className="flex justify-end space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="text-gray-600"
            >
              Discard
            </Button>
            <Button 
              type="submit"
              onClick={handleSubmit}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Add Category
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
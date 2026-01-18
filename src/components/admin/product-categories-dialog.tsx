'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw } from 'lucide-react';

// Allows dots, slashes, spaces (including trailing spaces) to match MX Merchant product names exactly
const categorySchema = z.object({
  product_name: z.string()
    .min(1, 'Product name is required')
    .max(500, 'Product name must be 500 characters or less'),
  category: z.enum(['TRT', 'Weight Loss', 'Peptides', 'ED', 'Other', 'Uncategorized']),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface ProductCategory {
  id: string;
  merchant_id: number;
  product_name: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: number;
}

interface CategoriesApiResponse {
  success: boolean;
  categories?: ProductCategory[];
  error?: string;
}

interface CreateCategoryApiResponse {
  success: boolean;
  category?: ProductCategory;
  error?: string;
}

export function ProductCategoriesDialog({
  open,
  onOpenChange,
  merchantId,
}: ProductCategoriesDialogProps): React.JSX.Element {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      category: 'Uncategorized',
    },
  });

  const selectedCategory = watch('category');

  const fetchCategories = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/tenants/${merchantId}/categories`, {
        credentials: 'include',
      });

      const result: CategoriesApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch categories');
      }

      setCategories(result.categories || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CategoryFormData): Promise<void> => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/admin/tenants/${merchantId}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result: CreateCategoryApiResponse = await response.json();

      if (!result.success || !result.category) {
        throw new Error(result.error || 'Failed to create category');
      }

      setCategories(prev => [...prev, result.category!]);
      reset();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to create category:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryBadgeVariant = (category: string): 'default' | 'destructive' | 'outline' | 'secondary' => {
    switch (category) {
      case 'TRT':
        return 'destructive';
      case 'Weight Loss':
        return 'secondary';
      case 'Peptides':
        return 'default';
      case 'ED':
        return 'outline';
      default:
        return 'outline';
    }
  };

  useEffect(() => {
    if (open && merchantId) {
      fetchCategories();
    }
  }, [open, merchantId]);

  const handleClose = (): void => {
    reset();
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product Categories - Merchant {merchantId}</DialogTitle>
          <DialogDescription>
            Manage product categories for this tenant. Categories are used to filter and organize products in the membership dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Category Form */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Product Category
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  {error}
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="product_name" className="text-sm font-medium">
                    Product Name *
                  </label>
                  <Input
                    id="product_name"
                    placeholder="e.g., Testosterone with Gonadorelin Tabs"
                    {...register('product_name')}
                    disabled={isSubmitting}
                  />
                  {errors.product_name && (
                    <p className="text-sm text-red-600">{errors.product_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="category" className="text-sm font-medium">
                    Category *
                  </label>
                  <Select
                    value={selectedCategory}
                    onValueChange={(value: CategoryFormData['category']) => setValue('category', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRT">TRT</SelectItem>
                      <SelectItem value="Weight Loss">Weight Loss</SelectItem>
                      <SelectItem value="Peptides">Peptides</SelectItem>
                      <SelectItem value="ED">ED</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                      <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-600">{errors.category.message}</p>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Adding...' : 'Add Category'}
              </Button>
            </form>
          </div>

          {/* Existing Categories Table */}
          <div className="border rounded-lg">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Existing Product Categories</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchCategories}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading categories...
                </div>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No product categories found. Add the first one above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        {category.product_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getCategoryBadgeVariant(category.category)}>
                          {category.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(category.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How Product Categories Work:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Categories are used to filter transactions in the membership dashboard</li>
              <li>• Product names must match exactly as they appear in MX Merchant</li>
              <li>• Each product can only have one category mapping</li>
              <li>• Categories help organize patients by treatment type (TRT, Weight Loss, etc.)</li>
            </ul>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
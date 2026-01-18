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
import { Plus, RefreshCw, Pencil, Trash2, Check, X } from 'lucide-react';

// Validation schema matching API and database constraints
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

interface CategoryManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CategoriesApiResponse {
  success: boolean;
  categories?: ProductCategory[];
  error?: string;
}

interface CategoryApiResponse {
  success: boolean;
  category?: ProductCategory;
  message?: string;
  error?: string;
}

export function CategoryManagementDialog({
  open,
  onOpenChange,
}: CategoryManagementDialogProps): React.JSX.Element {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // Edit form
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: errorsEdit },
    reset: resetEdit,
    setValue: setValueEdit,
    watch: watchEdit,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
  });

  const selectedCategory = watch('category');
  const selectedEditCategory = watchEdit('category');

  /**
   * Fetch categories for current user's merchant
   * Security: API automatically filters by merchant_id
   */
  const fetchCategories = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/categories', {
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

  /**
   * Create new category
   * Security: API automatically assigns to user's merchant_id
   */
  const onSubmit = async (data: CategoryFormData): Promise<void> => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result: CategoryApiResponse = await response.json();

      if (!result.success || !result.category) {
        throw new Error(result.error || 'Failed to create category');
      }

      // Add new category to list
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

  /**
   * Update existing category
   * Security: API verifies merchant ownership
   */
  const onUpdate = async (data: CategoryFormData): Promise<void> => {
    if (!editingId) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch(`/api/categories?id=${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result: CategoryApiResponse = await response.json();

      if (!result.success || !result.category) {
        throw new Error(result.error || 'Failed to update category');
      }

      // Update category in list
      setCategories(prev =>
        prev.map(cat => cat.id === editingId ? result.category! : cat)
      );
      setEditingId(null);
      resetEdit();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to update category:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Delete category (soft delete)
   * Security: API verifies merchant ownership
   */
  const handleDelete = async (categoryId: string): Promise<void> => {
    try {
      setDeletingId(categoryId);
      setError(null);

      const response = await fetch(`/api/categories?id=${categoryId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result: CategoryApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete category');
      }

      // Remove category from list
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to delete category:', err);
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Start editing a category
   */
  const startEditing = (category: ProductCategory): void => {
    setEditingId(category.id);
    setValueEdit('product_name', category.product_name);
    setValueEdit('category', category.category as CategoryFormData['category']);
  };

  /**
   * Cancel editing
   */
  const cancelEditing = (): void => {
    setEditingId(null);
    resetEdit();
    setError(null);
  };

  /**
   * Get badge variant for category
   */
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

  /**
   * Fetch categories when dialog opens
   */
  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  /**
   * Handle dialog close
   */
  const handleClose = (): void => {
    reset();
    resetEdit();
    setError(null);
    setEditingId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product Category Management</DialogTitle>
          <DialogDescription>
            Manage product categories for your organization. Categories help organize and filter transactions by treatment type.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Category Form */}
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Product Category
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && !editingId && (
                <Alert variant="destructive">
                  {error}
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="product_name" className="text-sm font-medium">
                    Product Name *
                  </label>
                  <Input
                    id="product_name"
                    placeholder="e.g., Testosterone Cypionate 200mg"
                    {...register('product_name')}
                    disabled={isSubmitting}
                  />
                  {errors.product_name && (
                    <p className="text-sm text-red-600">{errors.product_name.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Must match exactly as it appears in MX Merchant
                  </p>
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
            <div className="p-4 border-b bg-card">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Your Product Categories</h3>
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
                No product categories found. Add your first one above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Product Name</TableHead>
                      <TableHead className="w-[25%]">Category</TableHead>
                      <TableHead className="w-[20%]">Created</TableHead>
                      <TableHead className="w-[15%] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id}>
                        {editingId === category.id ? (
                          // Edit Mode
                          <>
                            <TableCell>
                              <Input
                                {...registerEdit('product_name')}
                                placeholder="Product name"
                                disabled={isSubmitting}
                                className="h-8"
                              />
                              {errorsEdit.product_name && (
                                <p className="text-xs text-red-600 mt-1">
                                  {errorsEdit.product_name.message}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={selectedEditCategory}
                                onValueChange={(value: CategoryFormData['category']) =>
                                  setValueEdit('category', value)
                                }
                                disabled={isSubmitting}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
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
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(category.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleSubmitEdit(onUpdate)}
                                  disabled={isSubmitting}
                                  title="Save changes"
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={cancelEditing}
                                  disabled={isSubmitting}
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          // View Mode
                          <>
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
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditing(category)}
                                  disabled={deletingId === category.id}
                                  title="Edit category"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(category.id)}
                                  disabled={deletingId === category.id}
                                  title="Delete category"
                                >
                                  {deletingId === category.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {editingId && error && (
              <div className="p-4 border-t">
                <Alert variant="destructive">
                  {error}
                </Alert>
              </div>
            )}
          </div>

          {/* Information Panel */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              How Product Categories Work:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Categories are used to filter transactions in the census dashboard</li>
              <li>• Product names must match exactly as they appear in MX Merchant</li>
              <li>• Each product can only have one category mapping per merchant</li>
              <li>• Categories help organize patients by treatment type (TRT, Weight Loss, etc.)</li>
              <li>• You can only manage categories for your own organization</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

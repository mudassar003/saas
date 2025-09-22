'use client';

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Calendar, Hash, Package, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

// Patient census record type - enterprise-grade typing
interface PatientCensusRecord {
  id: string;
  customer_name: string;
  product_name: string | null;
  product_category: string | null;
  membership_status: string;
  amount: number;
  last_payment_date: string;
  transaction_count: number;
  source: string | null;
  fulfillment_type: string | null;
  google_review_submitted: boolean | null;
  referral_source: string | null;
  ordered_by_provider: boolean | null;
  ordered_by_provider_at: string | null;
  created_at: string;
}

interface CensusTableProps {
  patients: PatientCensusRecord[];
  loading: boolean;
}

// Status badge configuration - following UI design system
const getStatusBadge = (status: string): { variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ReactElement } => {
  switch (status.toLowerCase()) {
    case 'active':
      return { 
        variant: 'default' as const, 
        icon: <CheckCircle2 className="w-3 h-3" /> 
      };
    case 'paused':
      return { 
        variant: 'secondary' as const, 
        icon: <Clock className="w-3 h-3" /> 
      };
    case 'canceled':
    case 'cancelled':
      return { 
        variant: 'destructive' as const, 
        icon: <XCircle className="w-3 h-3" /> 
      };
    default:
      return { 
        variant: 'outline' as const, 
        icon: <Clock className="w-3 h-3" /> 
      };
  }
};

// Category badge color mapping
const getCategoryColor = (category: string | null): string => {
  if (!category) return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  
  switch (category) {
    case 'TRT':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'Weight Loss':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'Peptides':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
    case 'ED':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
    case 'Other':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
};

export function CensusTable({ patients, loading }: CensusTableProps) {
  const [updatingCategory, setUpdatingCategory] = useState<Set<string>>(new Set());
  const [updatingMembership, setUpdatingMembership] = useState<Set<string>>(new Set());
  const [updatingGoogleReview, setUpdatingGoogleReview] = useState<Set<string>>(new Set());
  const [updatingReferralSource, setUpdatingReferralSource] = useState<Set<string>>(new Set());

  // Handle category updates following transaction table pattern
  const handleCategoryUpdate = async (patientId: string, newCategory: string): Promise<void> => {
    setUpdatingCategory(prev => new Set([...prev, patientId]));
    try {
      const response = await fetch(`/api/transactions?id=${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_category: newCategory })
      });
      
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating category:', error);
    } finally {
      setUpdatingCategory(prev => {
        const newSet = new Set(prev);
        newSet.delete(patientId);
        return newSet;
      });
    }
  };

  // Handle membership status updates following transaction table pattern
  const handleMembershipUpdate = async (patientId: string, newStatus: string): Promise<void> => {
    setUpdatingMembership(prev => new Set([...prev, patientId]));
    try {
      const response = await fetch(`/api/transactions?id=${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membership_status: newStatus })
      });
      
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating membership status:', error);
    } finally {
      setUpdatingMembership(prev => {
        const newSet = new Set(prev);
        newSet.delete(patientId);
        return newSet;
      });
    }
  };

  // Handle Google review updates
  const handleGoogleReviewUpdate = async (patientId: string, newValue: boolean): Promise<void> => {
    setUpdatingGoogleReview(prev => new Set([...prev, patientId]));
    try {
      const response = await fetch(`/api/transactions?id=${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_review_submitted: newValue })
      });
      
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating Google review status:', error);
    } finally {
      setUpdatingGoogleReview(prev => {
        const newSet = new Set(prev);
        newSet.delete(patientId);
        return newSet;
      });
    }
  };

  // Handle referral source updates
  const handleReferralSourceUpdate = async (patientId: string, newSource: string): Promise<void> => {
    setUpdatingReferralSource(prev => new Set([...prev, patientId]));
    try {
      const response = await fetch(`/api/transactions?id=${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referral_source: newSource })
      });
      
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating referral source:', error);
    } finally {
      setUpdatingReferralSource(prev => {
        const newSet = new Set(prev);
        newSet.delete(patientId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="p-8 text-center">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full"></div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Loading patient census...</p>
        </div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg">
        <div className="p-8 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">No patients found</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            No patients match the current filters. Try adjusting your search criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 dark:bg-slate-800/50">
            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Patient
              </div>
            </TableHead>
            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Product/Medication
              </div>
            </TableHead>
            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">
              Category
            </TableHead>
            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">
              Status
            </TableHead>
            <TableHead className="font-semibold text-slate-900 dark:text-slate-100 text-right">
              Amount
            </TableHead>
            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Last Payment
              </div>
            </TableHead>
            <TableHead className="font-semibold text-slate-900 dark:text-slate-100 text-center">
              <div className="flex items-center gap-2 justify-center">
                <Hash className="w-4 h-4" />
                Transactions
              </div>
            </TableHead>
            <TableHead className="font-semibold text-slate-900 dark:text-slate-100">
              Referral Source
            </TableHead>
            <TableHead className="font-semibold text-slate-900 dark:text-slate-100 text-center">
              Google Review
            </TableHead>
            <TableHead className="font-semibold text-slate-900 dark:text-slate-100 text-center">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => {
            const patientKey = `${patient.customer_name}|${patient.product_name || 'No Product'}`;
            const statusBadge = getStatusBadge(patient.membership_status);
            const categoryColor = getCategoryColor(patient.product_category);
            const isCategoryUpdating = updatingCategory.has(patient.id);
            const isMembershipUpdating = updatingMembership.has(patient.id);
            const isGoogleReviewUpdating = updatingGoogleReview.has(patient.id);
            const isReferralSourceUpdating = updatingReferralSource.has(patient.id);

            return (
              <TableRow 
                key={patientKey}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                {/* Patient Name */}
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span className="text-slate-900 dark:text-slate-100">
                      {patient.customer_name}
                    </span>
                    {patient.referral_source && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        via {patient.referral_source.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Product/Medication */}
                <TableCell>
                  <div className="flex flex-col max-w-xs">
                    <span className="text-sm text-slate-900 dark:text-slate-100 truncate">
                      {patient.product_name || 'No Product'}
                    </span>
                    {patient.fulfillment_type && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {patient.fulfillment_type.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Category - Editable */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {patient.product_category ? (
                      <select 
                        value={patient.product_category}
                        onChange={(e) => handleCategoryUpdate(patient.id, e.target.value)}
                        disabled={isCategoryUpdating}
                        className={`w-full text-xs border-none bg-transparent outline-none px-2 py-1 rounded-full cursor-pointer disabled:opacity-50 ${categoryColor}`}
                      >
                        <option value="TRT">TRT</option>
                        <option value="Weight Loss">Weight Loss</option>
                        <option value="Peptides">Peptides</option>
                        <option value="ED">ED</option>
                        <option value="Other">Other</option>
                        <option value="Uncategorized">Uncategorized</option>
                      </select>
                    ) : (
                      <select 
                        value="Uncategorized"
                        onChange={(e) => handleCategoryUpdate(patient.id, e.target.value)}
                        disabled={isCategoryUpdating}
                        className="w-full text-xs border-none bg-transparent outline-none px-2 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 cursor-pointer disabled:opacity-50"
                      >
                        <option value="TRT">TRT</option>
                        <option value="Weight Loss">Weight Loss</option>
                        <option value="Peptides">Peptides</option>
                        <option value="ED">ED</option>
                        <option value="Other">Other</option>
                        <option value="Uncategorized">Uncategorized</option>
                      </select>
                    )}
                  </div>
                </TableCell>

                {/* Membership Status - Editable */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <select 
                      value={patient.membership_status}
                      onChange={(e) => handleMembershipUpdate(patient.id, e.target.value)}
                      disabled={isMembershipUpdating}
                      className={`w-full text-xs border-none bg-transparent outline-none px-2 py-1 rounded cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 ${statusBadge.variant === 'default' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : statusBadge.variant === 'secondary' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="canceled">Canceled</option>
                    </select>
                    {patient.google_review_submitted && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        ✓ Google Review
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Amount */}
                <TableCell className="text-right font-medium text-slate-900 dark:text-slate-100">
                  ${patient.amount.toFixed(2)}
                </TableCell>

                {/* Last Payment Date */}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-900 dark:text-slate-100">
                      {format(new Date(patient.last_payment_date), 'MMM d, yyyy')}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(patient.last_payment_date), 'h:mm a')}
                    </span>
                  </div>
                </TableCell>

                {/* Transaction Count */}
                <TableCell className="text-center">
                  <Badge variant="outline" className="font-mono">
                    {patient.transaction_count}
                  </Badge>
                </TableCell>

                {/* Referral Source - Editable */}
                <TableCell>
                  <select 
                    value={patient.referral_source || 'other'}
                    onChange={(e) => handleReferralSourceUpdate(patient.id, e.target.value)}
                    disabled={isReferralSourceUpdating}
                    className={`w-full text-xs border-none bg-transparent outline-none px-2 py-1 rounded cursor-pointer disabled:opacity-50 ${
                      patient.referral_source === 'online' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : patient.referral_source === 'refer_a_friend'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <option value="online">Online</option>
                    <option value="refer_a_friend">Refer a Friend</option>
                    <option value="other">Other</option>
                  </select>
                </TableCell>

                {/* Google Review - Editable */}
                <TableCell className="text-center">
                  <select 
                    value={patient.google_review_submitted ? 'true' : 'false'}
                    onChange={(e) => handleGoogleReviewUpdate(patient.id, e.target.value === 'true')}
                    disabled={isGoogleReviewUpdating}
                    className={`w-full text-xs border-none bg-transparent outline-none px-2 py-1 rounded cursor-pointer disabled:opacity-50 ${
                      patient.google_review_submitted 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    <option value="true">✓ Yes</option>
                    <option value="false">✗ No</option>
                  </select>
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    {/* View Details Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      title="View patient transactions"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
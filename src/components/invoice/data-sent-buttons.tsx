'use client';

import { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { DataSentUpdate } from '@/types/invoice';

interface DataSentButtonsProps {
  invoiceId: string;
  currentStatus: 'pending' | 'yes' | 'no';
  onUpdateStatus: (update: DataSentUpdate) => void;
  disabled?: boolean;
}

export function DataSentButtons({ 
  invoiceId, 
  currentStatus, 
  onUpdateStatus, 
  disabled = false 
}: DataSentButtonsProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (status: 'yes' | 'no') => {
    if (isUpdating || disabled) return;
    
    setIsUpdating(true);
    try {
      await onUpdateStatus({
        invoice_id: invoiceId,
        status: status,
        notes: undefined
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getDisplayValue = () => {
    switch (currentStatus) {
      case 'yes':
        return 'YES';
      case 'no':
        return 'NO';
      case 'pending':
      default:
        return 'Select';
    }
  };

  const getDisplayColor = () => {
    switch (currentStatus) {
      case 'yes':
        return 'text-green-600';
      case 'no':
        return 'text-red-600';
      case 'pending':
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Select
      value={currentStatus === 'pending' ? '' : currentStatus}
      onValueChange={handleStatusUpdate}
      disabled={isUpdating || disabled}
    >
      <SelectTrigger className={`w-[80px] h-6 text-xs ${getDisplayColor()}`}>
        <SelectValue placeholder="Select">{getDisplayValue()}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="yes" className="text-green-600">
          <span className="font-medium">YES</span>
        </SelectItem>
        <SelectItem value="no" className="text-red-600">
          <span className="font-medium">NO</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
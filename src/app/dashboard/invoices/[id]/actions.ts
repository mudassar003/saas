'use server';

import { DataSentUpdate } from '@/types/invoice';

export async function updateDataSentStatus(update: DataSentUpdate) {
  // Implement your API call here
  console.log('Update status:', update);
  // Add actual database/API logic
}
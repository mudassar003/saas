// Authentication library exports
export * from './types';
export * from './utils';
export * from './context';
export * from './client-utils';

// Server-only exports (don't import these in client components)
// Use: import { ... } from '@/lib/auth/server-utils' instead
// export * from './server-utils';  // Commented to prevent client imports
// export * from './database';      // Commented to prevent client imports
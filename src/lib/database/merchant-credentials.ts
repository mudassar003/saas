import { createClient } from '@supabase/supabase-js';

interface MerchantCredentials {
  username: string;
  password: string;
  environment: 'production' | 'sandbox';
}

interface MerchantConfig {
  id: string;
  merchant_id: bigint;
  consumer_key: string;
  consumer_secret: string;
  environment: string;
  is_active: boolean;
}

// In-memory cache for credentials (5 minute TTL)
const credentialsCache = new Map<string, { credentials: MerchantCredentials; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getMerchantCredentials(merchantId: string): Promise<MerchantCredentials> {
  const cacheKey = `merchant_${merchantId}`;
  const cached = credentialsCache.get(cacheKey);
  
  // Return cached credentials if valid
  if (cached && cached.expires > Date.now()) {
    return cached.credentials;
  }
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data: config, error } = await supabase
    .from('mx_merchant_configs')
    .select('*')
    .eq('merchant_id', parseInt(merchantId))
    .eq('is_active', true)
    .single<MerchantConfig>();
    
  if (error || !config) {
    throw new Error(`No active credentials found for merchant ${merchantId}: ${error?.message || 'Not found'}`);
  }
  
  const credentials: MerchantCredentials = {
    username: config.consumer_key,
    password: config.consumer_secret, // TODO: Decrypt if encrypted
    environment: config.environment as 'production' | 'sandbox'
  };
  
  // Cache credentials
  credentialsCache.set(cacheKey, {
    credentials,
    expires: Date.now() + CACHE_TTL
  });
  
  return credentials;
}

export function getBaseUrl(environment: string): string {
  return environment === 'production' 
    ? 'https://api.mxmerchant.com'
    : 'https://sandbox.api.mxmerchant.com';
}

// Clear cache for specific merchant (useful for credential updates)
export function clearMerchantCache(merchantId: string): void {
  credentialsCache.delete(`merchant_${merchantId}`);
}

// Clear all cached credentials
export function clearAllCache(): void {
  credentialsCache.clear();
}
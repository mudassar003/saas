'use client';

import { useState } from 'react';

export default function WebhookTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [webhookData, setWebhookData] = useState<Record<string, unknown>[]>([]);

  const createWebhookSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/webhook-test/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'Successful Payments', // Test with successful payments
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error creating webhook:', error);
      setResult({ error: 'Failed to create webhook subscription' });
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookData = async () => {
    try {
      const response = await fetch('/api/webhook-test/data');
      const data = await response.json();
      setWebhookData(data.data || []);
    } catch (error) {
      console.error('Error fetching webhook data:', error);
    }
  };

  const clearWebhookData = async () => {
    try {
      await fetch('/api/webhook-test/clear', { method: 'DELETE' });
      setWebhookData([]);
    } catch (error) {
      console.error('Error clearing webhook data:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">MX Merchant Webhook Test</h1>
        
        {/* Webhook Creation */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Webhook Subscription</h2>
          <p className="text-gray-600 mb-4">
            This will create a webhook subscription for &quot;Successful Payments&quot; events
          </p>
          <button
            onClick={createWebhookSubscription}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Webhook'}
          </button>
          
          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Webhook Data Display */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Received Webhook Data</h2>
            <div className="space-x-2">
              <button
                onClick={fetchWebhookData}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Refresh Data
              </button>
              <button
                onClick={clearWebhookData}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Clear Data
              </button>
            </div>
          </div>
          
          <p className="text-gray-600 mb-4">
            Webhook endpoint: <code className="bg-gray-100 px-2 py-1 rounded">
              https://saas-wine-three.vercel.app/api/webhook-test/receive
            </code>
          </p>

          {webhookData.length === 0 ? (
            <p className="text-gray-500">No webhook data received yet</p>
          ) : (
            <div className="space-y-4">
              {webhookData.map((item, index) => (
                <div key={index} className="border rounded p-4">
                  <div className="text-xs text-gray-500 mb-2">
                    Received: {new Date(item.created_at as string).toLocaleString()}
                  </div>
                  <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
                    {JSON.stringify(item.webhook_data, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import { redirect } from 'next/navigation';

export default async function Home() {
  // Direct redirect to dashboard since no authentication is required
  redirect('/dashboard');
}

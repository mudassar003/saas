import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to dashboard - this is an admin-only application
  redirect('/dashboard');
}

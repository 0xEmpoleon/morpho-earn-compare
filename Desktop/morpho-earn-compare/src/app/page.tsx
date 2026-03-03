'use client';
import StablecoinDashboard from '@/components/MorphoEarnCompare';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="w-full max-w-7xl">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-8 text-center">Morpho Earn Compare</h1>
        <StablecoinDashboard />
      </div>
    </main>
  );
}

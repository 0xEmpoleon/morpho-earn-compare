import VaultExplorer from '@/components/VaultExplorer';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0c0f]">
      <div className="w-full max-w-7xl">
        <VaultExplorer />
      </div>
    </main>
  );
}

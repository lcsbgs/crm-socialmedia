import { brand } from "@/config/brand";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
        <p className="text-muted">{brand.tagline}</p>
      </div>
      <p className="text-sm text-muted">{brand.description}</p>
    </main>
  );
}

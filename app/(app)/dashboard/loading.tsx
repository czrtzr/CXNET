import { Skeleton } from "@/components/ui/Skeleton";

// Dashboard loading state: the certificate hero, then the three summary cards.
export default function Loading() {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.22em] text-text-faint">
        Overview
      </p>
      <Skeleton className="mt-4 h-44 w-full" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}

import { cn } from "../lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl bg-gray-200 dark:bg-slate-700 skeleton-shimmer", className)} />
  );
}

export function TableSkeleton({ columns, rows = 5, className }: { columns: number; rows?: number; className?: string }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td colSpan={columns} className="px-8 py-4">
            <Skeleton className={cn("h-12 w-full", className)} />
          </td>
        </tr>
      ))}
    </>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card p-8", className)}>
      <Skeleton className="h-6 w-1/3 mb-8" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

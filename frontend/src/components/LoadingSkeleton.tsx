import { cn } from "../lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-2xl bg-gray-200 dark:bg-slate-700", className)} />
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
    <div className={cn("bg-white dark:bg-slate-800 rounded-[2.5rem] border border-gray-100 dark:border-slate-700 p-8 shadow-sm", className)}>
      <Skeleton className="h-6 w-1/3 mb-8" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

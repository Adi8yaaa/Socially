"use client";

export function ProgressStoryBar({ total }: { total: number }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(total, 1)}, minmax(0, 1fr))` }}>
      {Array.from({ length: Math.max(total, 1) }).map((_, index) => (
        <div key={index} className="h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full bg-primary" />
        </div>
      ))}
    </div>
  );
}

/* Skeleton loaders — LeadVibe Design System */

interface SkeletonProps {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}

const RADIUS = {
  sm:   "rounded-[6px]",
  md:   "rounded-[9px]",
  lg:   "rounded-[12px]",
  full: "rounded-full",
};

export function Skeleton({ className = "", rounded = "md" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${RADIUS[rounded]} ${className}`}
    />
  );
}

/* Card skeleton — reproduit la structure d'une LeadCard */
export function LeadCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] p-5 flex flex-col gap-3"
    >
      {/* Titre */}
      <Skeleton className="h-4 w-3/4" />

      {/* Téléphone */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-3.5" rounded="full" />
        <Skeleton className="h-3.5 w-32" />
      </div>

      {/* Adresse */}
      <div className="flex items-start gap-2">
        <Skeleton className="h-3.5 w-3.5 shrink-0 mt-0.5" rounded="full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </div>

      {/* Note */}
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-3.5 w-3.5" rounded="full" />
        <Skeleton className="h-3.5 w-8" />
      </div>

      {/* Site web */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-3.5" rounded="full" />
        <Skeleton className="h-3.5 w-40" />
      </div>

      {/* Bouton appeler */}
      <Skeleton className="h-9 w-full mt-1" rounded="md" />
    </div>
  );
}

/* Ligne skeleton — pour les listes (CRM) */
export function ProspectRowSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] p-5 flex flex-col sm:flex-row sm:items-start gap-4"
    >
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-4 w-48" />
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <Skeleton className="h-3.5 w-36" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Skeleton className="h-8 w-28" rounded="md" />
        <Skeleton className="h-8 w-8" rounded="md" />
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("relative overflow-hidden rounded-md bg-muted/85", className)}
      {...props}
    />
  );
}

export { Skeleton };

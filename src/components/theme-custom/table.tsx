import {
  Table as TablePrimitive,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead as TableHeadPrimitive,
  TableHeader as TableHeaderPrimitive,
  TableRow as TableRowPrimitive,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * This project's actual Table — flat moss-bordered container instead of
 * shadcn's default muted borders, matching the rest of the design system.
 * Built on top of src/components/ui/table.tsx, which stays untouched.
 */
function Table({ className, ...props }: React.ComponentProps<typeof TablePrimitive>) {
  return (
    <div className="overflow-hidden rounded-lg border border-moss shadow-hard-sm">
      <TablePrimitive className={cn("text-moss", className)} {...props} />
    </div>
  );
}

function TableHeader({
  className,
  ...props
}: React.ComponentProps<typeof TableHeaderPrimitive>) {
  return (
    <TableHeaderPrimitive
      className={cn("border-b border-moss bg-vellum", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<typeof TableRowPrimitive>) {
  return (
    <TableRowPrimitive
      className={cn("border-b border-moss/20 hover:bg-vellum/50", className)}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<typeof TableHeadPrimitive>) {
  return (
    <TableHeadPrimitive
      className={cn("font-mono text-xs tracking-wide text-moss uppercase", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };

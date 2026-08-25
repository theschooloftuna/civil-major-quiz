import Link from "next/link";

import { buttonVariants } from "@/components/theme-custom/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/theme-custom/table";
import type { SubscriberRow } from "@/lib/supabase/subscribers";
import { cn } from "@/lib/utils";

interface SubscribersTableProps {
  rows: SubscriberRow[];
  currentPage: number;
  totalPages: number;
  basePath: string;
}

const SOURCE_LABELS: Record<SubscriberRow["source"], string> = {
  quiz: "Quiz",
  newsletter_page: "Newsletter page",
};

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function SubscribersTable({ rows, currentPage, totalPages, basePath }: SubscribersTableProps) {
  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Unsubscribed on</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                No subscribers yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.email}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "font-mono text-xs font-semibold uppercase tracking-wide",
                      row.status === "subscribed" ? "text-green" : "text-muted-foreground"
                    )}
                  >
                    {row.status}
                  </span>
                </TableCell>
                <TableCell>{SOURCE_LABELS[row.source]}</TableCell>
                <TableCell>{formatTimestamp(row.createdAt)}</TableCell>
                <TableCell>
                  {row.unsubscribedAt ? formatTimestamp(row.unsubscribedAt) : "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Link
            href={`${basePath}?page=${currentPage - 1}`}
            aria-disabled={currentPage <= 1}
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              currentPage <= 1 && "pointer-events-none opacity-50"
            )}
          >
            Previous
          </Link>
          <span className="font-mono text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Link
            href={`${basePath}?page=${currentPage + 1}`}
            aria-disabled={currentPage >= totalPages}
            className={cn(
              buttonVariants({ variant: "secondary", size: "sm" }),
              currentPage >= totalPages && "pointer-events-none opacity-50"
            )}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}

export { SubscribersTable };

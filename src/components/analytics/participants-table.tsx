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
import { MAJORS } from "@/lib/majors";
import type { AnalyticsRow } from "@/lib/supabase/analytics";
import { cn } from "@/lib/utils";

const MAJOR_NAME_BY_ID = new Map(MAJORS.map((major) => [major.id, major.name]));

interface ParticipantsTableProps {
  rows: AnalyticsRow[];
  currentPage: number;
  totalPages: number;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function ParticipantsTable({ rows, currentPage, totalPages }: ParticipantsTableProps) {
  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Submitted</TableHead>
            <TableHead>Variant</TableHead>
            <TableHead>Top major</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                No participants yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const topMajorId = row.topMajors[0]?.majorId;
              return (
                <TableRow key={row.id}>
                  <TableCell>{formatTimestamp(row.createdAt)}</TableCell>
                  <TableCell className="capitalize">{row.variant}</TableCell>
                  <TableCell>{topMajorId ? MAJOR_NAME_BY_ID.get(topMajorId) : "—"}</TableCell>
                  <TableCell>{row.email ?? ""}</TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Link
            href={`/analytics?page=${currentPage - 1}`}
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
            href={`/analytics?page=${currentPage + 1}`}
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

export { ParticipantsTable };

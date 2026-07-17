import { cn } from "@/lib/utils";
import { MAJORS } from "@/lib/majors";
import type { MajorScore } from "@/lib/scoring";

interface ResultsListProps {
  /** Already narrowed to the top matches, e.g. via getTopMajors. */
  results: MajorScore[];
}

function ResultsList({ results }: ResultsListProps) {
  return (
    <ol className="flex w-full flex-col gap-5">
      {results.map((result, index) => {
        const major = MAJORS.find((m) => m.id === result.majorId);
        if (!major) return null;
        const isTopMatch = index === 0;

        return (
          <li
            key={result.majorId}
            className={cn(
              "flex flex-col gap-3 rounded-lg border border-moss p-6",
              isTopMatch ? "bg-acid text-moss shadow-hard" : "bg-card text-card-foreground shadow-hard-sm"
            )}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-xs font-semibold uppercase tracking-wide text-moss/70">
                #{index + 1} match
              </span>
              <span
                className={cn(
                  "font-mono text-lg font-semibold",
                  isTopMatch ? "text-moss" : "text-green"
                )}
              >
                {Math.round(result.percentage)}%
              </span>
            </div>
            <h3 className="text-2xl font-normal">{major.name}</h3>
            <p className="text-base text-moss/80">{major.description}</p>
            <p className="font-mono text-xs tracking-wide text-moss/70 uppercase">
              {major.careers.join(" · ")}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export { ResultsList };

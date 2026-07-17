import { MAJORS } from "@/lib/majors";
import type { MajorScore } from "@/lib/scoring";

interface ResultsListProps {
  /** Already narrowed to the top matches, e.g. via getTopMajors. */
  results: MajorScore[];
}

function ResultsList({ results }: ResultsListProps) {
  return (
    <ol className="flex w-full flex-col gap-4">
      {results.map((result, index) => {
        const major = MAJORS.find((m) => m.id === result.majorId);
        if (!major) return null;

        return (
          <li
            key={result.majorId}
            className="flex flex-col gap-2 rounded-lg border border-foreground bg-card p-4 shadow-hard-sm"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                #{index + 1} match
              </span>
              <span className="font-mono text-sm font-semibold text-primary">
                {Math.round(result.percentage)}%
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">{major.name}</h3>
            <p className="text-sm text-muted-foreground">{major.description}</p>
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              {major.careers.join(" · ")}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export { ResultsList };

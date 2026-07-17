import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  type ChartConfig,
} from "@/components/ui/chart";

/**
 * Centralizes the import point for shadcn's chart primitives per the
 * golden rule (real components import from theme-custom/, never straight
 * from ui/). No styling changes on top - ui/chart.tsx already consumes
 * this project's --chart-1..5 tokens from globals.css directly.
 */
export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle };
export type { ChartConfig };

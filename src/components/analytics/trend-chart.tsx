"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/theme-custom/chart";
import type { DailyTrendPoint } from "@/lib/analytics/stats";

interface TrendChartProps {
  data: DailyTrendPoint[];
}

const chartConfig = {
  count: { label: "Submissions", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatDateLabel(date: string) {
  const [, month, day] = date.split("-");
  return `${month}/${day}`;
}

function TrendChart({ data }: TrendChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
      <LineChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickFormatter={formatDateLabel}
          minTickGap={24}
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip
          content={
            <ChartTooltipContent labelFormatter={(value) => formatDateLabel(String(value))} />
          }
        />
        <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}

export { TrendChart };

"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/theme-custom/chart";
import type { MajorDistributionEntry } from "@/lib/analytics/stats";

interface MajorDistributionChartProps {
  data: MajorDistributionEntry[];
}

const chartConfig = {
  count: { label: "Participants", color: "var(--chart-1)" },
} satisfies ChartConfig;

function MajorDistributionChart({ data }: MajorDistributionChartProps) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-96 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={170}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={4}>
          <LabelList
            dataKey="percentage"
            position="right"
            className="fill-foreground text-xs"
            formatter={(value: number | string | boolean | null | undefined) =>
              `${Number(value ?? 0).toFixed(0)}%`
            }
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export { MajorDistributionChart };

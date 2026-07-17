import { Card, CardContent, CardHeader, CardTitle } from "@/components/theme-custom/card";

interface StatTileProps {
  label: string;
  value: string;
  sublabel?: string;
}

function StatTile({ label, value, sublabel }: StatTileProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-normal text-foreground">{value}</p>
        {sublabel && <p className="text-sm text-muted-foreground">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}

export { StatTile };

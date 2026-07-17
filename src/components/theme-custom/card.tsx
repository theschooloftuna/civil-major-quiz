import {
  Card as CardPrimitive,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * This project's actual Card — flat, hard-edged (border-moss + shadow-hard-sm)
 * instead of shadcn's default ring/shadow, matching the rest of the design
 * system. Built on top of src/components/ui/card.tsx, which stays untouched.
 */
function Card({ className, ...props }: React.ComponentProps<typeof CardPrimitive>) {
  return (
    <CardPrimitive
      className={cn("rounded-lg border border-moss bg-white shadow-hard-sm", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };

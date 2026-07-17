import { Field as FieldPrimitive, FieldLabel as FieldLabelPrimitive } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * This project's actual form-field wrapper — bigger label text than
 * shadcn's default (matches the "large text" aesthetic pass), built on top
 * of src/components/ui/field.tsx's primitives rather than editing that file.
 */
function Field({ className, ...props }: React.ComponentProps<typeof FieldPrimitive>) {
  return <FieldPrimitive className={cn("gap-2", className)} {...props} />;
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof FieldLabelPrimitive>) {
  return (
    <FieldLabelPrimitive
      className={cn(
        "font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function FieldError({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      role="alert"
      data-slot="field-error"
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    />
  );
}

export { Field, FieldLabel, FieldError };

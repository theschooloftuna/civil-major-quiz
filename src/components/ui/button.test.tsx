import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { Button } from "@/components/ui/button";

test("renders a button with its label", () => {
  render(<Button>Start quiz</Button>);
  expect(screen.getByRole("button", { name: "Start quiz" })).toBeInTheDocument();
});

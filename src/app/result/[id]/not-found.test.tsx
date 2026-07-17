import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import ResultNotFound from "./not-found";

describe("ResultNotFound", () => {
  test("links back to the home page to take the quiz", () => {
    render(<ResultNotFound />);
    expect(screen.getByRole("link", { name: /take the quiz/i })).toHaveAttribute("href", "/");
  });
});

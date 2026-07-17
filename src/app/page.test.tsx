import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import Home from "./page";

describe("Home", () => {
  test("links to both quiz variants", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: /multiple choice/i })).toHaveAttribute(
      "href",
      "/quiz"
    );
    expect(screen.getByRole("link", { name: /rate each statement/i })).toHaveAttribute(
      "href",
      "/quiz/scale"
    );
  });
});

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";

import UnsubscribeNotFound from "./not-found";

describe("UnsubscribeNotFound", () => {
  test("explains that the link is invalid", () => {
    render(<UnsubscribeNotFound />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/isn't valid/i);
  });

  test("never reveals an email address", () => {
    const { container } = render(<UnsubscribeNotFound />);

    expect(container.textContent).not.toMatch(/@/);
  });
});

import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

import "@testing-library/jest-dom/vitest";

// Next.js's bundler no-ops "server-only" on the server compilation target;
// it otherwise throws unconditionally, so modules that import it need the
// same treatment under Vitest.
vi.mock("server-only", () => ({}));

// vitest.config.mts doesn't enable `test.globals`, so React Testing
// Library's own auto-cleanup (which relies on a global `afterEach`) never
// registers itself - without this, DOM from one test's render() leaks into
// the next test in the same file.
afterEach(() => {
  cleanup();
});

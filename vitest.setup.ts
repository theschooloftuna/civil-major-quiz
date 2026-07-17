import { vi } from "vitest";

import "@testing-library/jest-dom/vitest";

// Next.js's bundler no-ops "server-only" on the server compilation target;
// it otherwise throws unconditionally, so modules that import it need the
// same treatment under Vitest.
vi.mock("server-only", () => ({}));

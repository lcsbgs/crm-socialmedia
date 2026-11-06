import "server-only";
import { isMockMode } from "@/lib/integrations/mode";
import { mockLoginAdapter } from "./mock";
import { realLoginAdapter } from "./real";

export function loginAdapter() {
  return isMockMode() ? mockLoginAdapter : realLoginAdapter;
}

export * from "./types";

import "server-only";
import { isMockMode } from "@/lib/integrations/mode";
import { graphAdapter } from "./graph";
import { mockMetaAdapter } from "./mock";
import type { MetaAdapter } from "./types";

export function metaAdapter(): MetaAdapter | null {
  if (isMockMode()) return mockMetaAdapter;
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null;
  return graphAdapter({ appId, appSecret, version: process.env.META_GRAPH_VERSION });
}

export * from "./types";

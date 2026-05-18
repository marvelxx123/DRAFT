import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { marketingManagerFunction } from "@/inngest/marketing-manager";
import {
  contentAgentScheduled,
  contentAgentTriggered,
} from "@/inngest/content-agent";
import {
  seoAgentScheduled,
  seoAgentTriggered,
} from "@/inngest/seo-agent";
import {
  outreachAgentScheduled,
  outreachAgentTriggered,
} from "@/inngest/outreach-agent";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Marketing Manager — master orchestrator
    marketingManagerFunction,

    // Content Agent — scheduled + triggered
    contentAgentScheduled,
    contentAgentTriggered,

    // SEO Agent — scheduled + triggered
    seoAgentScheduled,
    seoAgentTriggered,

    // Outreach Agent — scheduled + triggered
    outreachAgentScheduled,
    outreachAgentTriggered,
  ],
});

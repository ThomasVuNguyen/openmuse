import "./config.ts";
import { createOpenAI } from "@ai-sdk/openai";
import { HttpAgent } from "@ag-ui/client";
import {
  type AgentsFactory,
  type CopilotKitIntelligence,
  CopilotRuntime,
  createCopilotHonoHandler,
} from "@copilotkit/runtime/v2";
import type { Auth } from "./auth.ts";
import type { Config } from "./config.ts";
import { ConversationAgent } from "./engine/conversation.ts";
import type { AgentService } from "./engine/service.ts";

export function resolveAgentModel(modelSpec: string | undefined): any {
  if (!modelSpec) return "openai/unconfigured";
  if (modelSpec.startsWith("openai/")) {
    const modelName = modelSpec.slice(7);
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });
    return openai.chat(modelName);
  }
  return modelSpec;
}

export function agentConfigured(config: Config) {
  return (
    config.agentBackend === "sample" ||
    (config.agentBackend === "agui"
      ? Boolean(config.agentUrl)
      : Boolean(
          config.model &&
            (process.env.OPENAI_API_KEY ||
              process.env.ANTHROPIC_API_KEY ||
              process.env.GOOGLE_API_KEY),
        ))
  );
}
export function makeRuntime(
  config: Config,
  service: AgentService,
  auth: Auth,
  intelligence?: CopilotKitIntelligence,
) {
  const agents: AgentsFactory = async ({ request }) => ({
    default:
      config.agentBackend === "sample"
        ? new ConversationAgent(
            config,
            service,
            await auth.owner(request.headers.get("authorization") ?? undefined),
          )
        : config.agentBackend === "agui"
          ? new HttpAgent({
              url: config.agentUrl ?? "http://127.0.0.1:1/unconfigured",
              headers: config.agentToken ? { Authorization: `Bearer ${config.agentToken}` } : {},
            })
          : new ConversationAgent(
              config,
              service,
              await auth.owner(request.headers.get("authorization") ?? undefined),
            ),
  });
  const runtime = intelligence
    ? new CopilotRuntime({
        agents,
        intelligence,
        identifyUser: async (request) => ({
          id: await auth.owner(request.headers.get("authorization") ?? undefined),
          name: "OpenMuse user",
        }),
        generateThreadNames: false,
      })
    : new CopilotRuntime({ agents });
  return createCopilotHonoHandler({ runtime, basePath: "/api/copilotkit" });
}

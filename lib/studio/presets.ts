import type { Channel } from "./types";
export interface ChannelPreset {
  instructions: string;
  references: {
    title: string;
    content: string;
    kind: "brand" | "source" | "example";
  }[];
}
export function demoPreset(channel: Channel): ChannelPreset {
  return {
    instructions: `SANITIZED PREVIEW PRESET — ${channel}. Use the approved Hub brief or supplied topic to propose specific, useful ideas. Retain the channel voice and format, identify evidence needed, and never invent personal experiences. Generate drafts only from selected/approved ideas. Human final approval and current founder rules apply. Full internal brand knowledge is imported only in an authenticated live workspace.`,
    references: [
      {
        title: `${channel} preview playbook`,
        content:
          "Illustrative source guidance for preview only. Use a clear audience, scoped factual claims, a source checklist, channel-native format and a human review step. Do not treat older CTA or approval defaults as permission to override current founder policy.",
        kind: "example",
      },
    ],
  };
}

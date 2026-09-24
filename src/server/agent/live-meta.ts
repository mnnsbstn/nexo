import {
  LIVE_HISTORY_MESSAGE_LIMIT,
  MAX_LIVE_TOOL_ROUNDS,
} from "@/server/agent/config";

export type LiveAgentMeta = {
  toolRoundsUsed: number;
  toolRoundsMax: number;
  historyMessagesUsed: number;
  historyMessagesMax: number;
  toolLimitReached: boolean;
};

export function getLiveAgentLimits() {
  return {
    toolRoundsMax: MAX_LIVE_TOOL_ROUNDS,
    historyMessagesMax: LIVE_HISTORY_MESSAGE_LIMIT,
  };
}

export function formatLiveAgentBudgetLabel(meta: LiveAgentMeta): string {
  return `Kontext: ${meta.historyMessagesUsed}/${meta.historyMessagesMax} Chat · Tools ${meta.toolRoundsUsed}/${meta.toolRoundsMax}`;
}

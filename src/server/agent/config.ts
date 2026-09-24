/** Max tool rounds per user message (read tools + propose_action). */
export const MAX_LIVE_TOOL_ROUNDS = 4;

/** Retries for transient model provider errors. */
export const LIVE_MODEL_MAX_RETRIES = 2;

/** Open tasks included in compact context snapshots. */
export const LIVE_CONTEXT_TASK_LIMIT = 25;

/** Recent chat messages sent to the live model. */
export const LIVE_HISTORY_MESSAGE_LIMIT = 12;

import type { PollIntervalConfig } from './pollConfig.js'

export type { PollIntervalConfig }

export const DEFAULT_POLL_CONFIG: PollIntervalConfig = {
  multisession_poll_interval_ms_not_at_capacity: 5_000,
  multisession_poll_interval_ms_partial_capacity: 2_000,
  multisession_poll_interval_ms_at_capacity: 10_000,
  non_exclusive_heartbeat_interval_ms: 30_000,
  reclaim_older_than_ms: 300_000,
}

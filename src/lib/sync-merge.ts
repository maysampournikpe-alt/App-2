// Conflict rule for account sync: the most recent change wins.

/** True when the remote copy should replace the local one. */
export function remoteWins(local: { updatedAt: number } | undefined, remote: { updatedAt: number }): boolean {
  return !local || remote.updatedAt > local.updatedAt;
}

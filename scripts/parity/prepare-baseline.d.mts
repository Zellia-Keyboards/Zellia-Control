import type { PreviewServer } from 'vite';

/** Port `parity:baseline` serves the baseline on unless `--port` is given. */
export declare const BASELINE_PORT: number;

/** Recorded in the baseline's build/ after a build; install and build are skipped while it matches. */
export interface BaselineStamp {
  version: number;
  /** Baseline checkout HEAD. */
  commit: string;
  /** hashTree of this repository's src-controller/. */
  controller: string;
  /** SHA-256 of the baseline's yarn.lock. */
  lockfile: string;
}

/** Parses `git worktree list --porcelain` into the checked-out worktrees (bare entries skipped). */
export declare function parseWorktrees(porcelain: string): { path: string; head: string }[];

/**
 * The baseline checkout: `dir` (`--baseline-dir` / PARITY_BASELINE_DIR), otherwise a git worktree
 * of this repository at the baseline commit. Verifies the checkout is at that commit.
 */
export declare function resolveBaselineDir(dir?: string): string;

/** Content hash of a directory tree (paths and bytes), ignoring node_modules. */
export declare function hashTree(dir: string): string;

/** Whether the stamp read from the baseline's build/ matches the one the current inputs produce. */
export declare function isUpToDate(stamp: unknown, expected: BaselineStamp): boolean;

/** Syncs the controller, installs and builds the baseline unless up to date; returns build/. */
export declare function prepareBaseline(options?: {
  baselineDir?: string;
  force?: boolean;
}): Promise<string>;

/** Serves the baseline build like the production static host. Port 0 picks a free port. */
export declare function serveBaseline(options: {
  buildDir: string;
  port?: number;
}): Promise<PreviewServer>;

/** Root URL of a server started by serveBaseline, e.g. `http://localhost:4180/`. */
export declare function serverUrl(server: PreviewServer): string;

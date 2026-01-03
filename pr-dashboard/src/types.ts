/**
 * PR Tracking Dashboard - Type Definitions
 */

export interface Env {
  PR_CACHE: KVNamespace;
  PR_TRACKER: DurableObjectNamespace;
  GITHUB_TOKEN: string;
  GITHUB_WEBHOOK_SECRET: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  CLOUDFLARE_PROJECT: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
}

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  isDraft: boolean;
  updatedAt: string;
  createdAt: string;
  branch: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  reviewStatus: ReviewStatus;
  ciStatus: CIStatus;
  reviewers: string[];
  labels: string[];
}

export type ReviewStatus =
  | 'pending'
  | 'review_requested'
  | 'approved'
  | 'changes_requested'
  | 'commented';

export type CIStatus = 'pending' | 'success' | 'failure' | 'neutral' | 'unknown';

export interface PRListResponse {
  prs: PullRequest[];
  lastUpdated: string;
  repoUrl: string;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  preferences: NotificationPreferences;
  createdAt: string;
}

export interface NotificationPreferences {
  newPR: boolean;
  reviewRequested: boolean;
  ciStatusChange: boolean;
  prApproved: boolean;
  prMerged: boolean;
}

export interface WebhookPayload {
  action: string;
  pull_request?: GitHubPR;
  check_run?: GitHubCheckRun;
  review?: GitHubReview;
  sender: {
    login: string;
  };
  repository: {
    full_name: string;
  };
}

export interface GitHubPR {
  number: number;
  title: string;
  html_url: string;
  state: string;
  draft: boolean;
  updated_at: string;
  created_at: string;
  head: {
    ref: string;
  };
  user: {
    login: string;
    avatar_url: string;
  };
  labels: Array<{ name: string }>;
  requested_reviewers: Array<{ login: string }>;
}

export interface GitHubCheckRun {
  name: string;
  status: string;
  conclusion: string | null;
  pull_requests: Array<{ number: number }>;
}

export interface GitHubReview {
  state: string;
  user: {
    login: string;
  };
}

export interface GraphQLPRResponse {
  data: {
    repository: {
      pullRequests: {
        nodes: GraphQLPRNode[];
      };
    };
  };
}

export interface GraphQLPRNode {
  number: number;
  title: string;
  url: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  isDraft: boolean;
  updatedAt: string;
  createdAt: string;
  headRefName: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  labels: {
    nodes: Array<{ name: string }>;
  };
  reviewRequests: {
    nodes: Array<{
      requestedReviewer: {
        login?: string;
      } | null;
    }>;
  };
  reviews: {
    nodes: Array<{
      state: string;
      author: {
        login: string;
      };
    }>;
  };
  commits: {
    nodes: Array<{
      commit: {
        statusCheckRollup: {
          state: string;
        } | null;
      };
    }>;
  };
}

export interface DashboardConfig {
  owner: string;
  repo: string;
  project: string;
  accountId?: string;
  vapidPublicKey?: string;
  refreshInterval: number;
}

export interface WSMessage {
  type: 'pr_update' | 'pr_new' | 'pr_closed' | 'ci_update' | 'connected' | 'pong';
  data?: PullRequest | PullRequest[];
  timestamp: string;
}

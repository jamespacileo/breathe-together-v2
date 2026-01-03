/**
 * GitHub API Integration
 * Fetches PR data using GraphQL for efficiency
 */

import type {
  CIStatus,
  Env,
  GraphQLPRNode,
  GraphQLPRResponse,
  PullRequest,
  ReviewStatus,
} from './types';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

const PR_QUERY = `
query OpenPRs($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    pullRequests(states: OPEN, first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        number
        title
        url
        state
        isDraft
        updatedAt
        createdAt
        headRefName
        author {
          login
          avatarUrl
        }
        labels(first: 10) {
          nodes {
            name
          }
        }
        reviewRequests(first: 10) {
          nodes {
            requestedReviewer {
              ... on User {
                login
              }
              ... on Team {
                name
              }
            }
          }
        }
        reviews(last: 10) {
          nodes {
            state
            author {
              login
            }
          }
        }
        commits(last: 1) {
          nodes {
            commit {
              statusCheckRollup {
                state
              }
            }
          }
        }
      }
    }
  }
}
`;

export async function fetchOpenPRs(env: Env): Promise<PullRequest[]> {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'PR-Tracking-Dashboard/1.0',
    },
    body: JSON.stringify({
      query: PR_QUERY,
      variables: {
        owner: env.GITHUB_OWNER,
        repo: env.GITHUB_REPO,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${text}`);
  }

  const result = (await response.json()) as GraphQLPRResponse;

  if (!result.data?.repository?.pullRequests?.nodes) {
    throw new Error('Unexpected GraphQL response structure');
  }

  return result.data.repository.pullRequests.nodes.map(transformPR);
}

function transformPR(node: GraphQLPRNode): PullRequest {
  return {
    number: node.number,
    title: node.title,
    url: node.url,
    state: node.state,
    isDraft: node.isDraft,
    updatedAt: node.updatedAt,
    createdAt: node.createdAt,
    branch: node.headRefName,
    author: {
      login: node.author?.login || 'unknown',
      avatarUrl: node.author?.avatarUrl || '',
    },
    reviewStatus: getReviewStatus(node),
    ciStatus: getCIStatus(node),
    reviewers: getReviewers(node),
    labels: node.labels?.nodes?.map((l) => l.name) || [],
  };
}

function getReviewStatus(node: GraphQLPRNode): ReviewStatus {
  const reviews = node.reviews?.nodes || [];
  const reviewRequests = node.reviewRequests?.nodes || [];

  // Check for approval or changes requested (most recent wins)
  for (let i = reviews.length - 1; i >= 0; i--) {
    const review = reviews[i];
    if (review.state === 'APPROVED') return 'approved';
    if (review.state === 'CHANGES_REQUESTED') return 'changes_requested';
  }

  // Check if review is requested
  if (reviewRequests.length > 0) return 'review_requested';

  // Check for comments
  if (reviews.some((r) => r.state === 'COMMENTED')) return 'commented';

  return 'pending';
}

function getCIStatus(node: GraphQLPRNode): CIStatus {
  const lastCommit = node.commits?.nodes?.[0]?.commit;
  const rollup = lastCommit?.statusCheckRollup;

  if (!rollup) return 'unknown';

  switch (rollup.state) {
    case 'SUCCESS':
      return 'success';
    case 'FAILURE':
    case 'ERROR':
      return 'failure';
    case 'PENDING':
    case 'EXPECTED':
      return 'pending';
    default:
      return 'neutral';
  }
}

function getReviewers(node: GraphQLPRNode): string[] {
  const requestedReviewers =
    node.reviewRequests?.nodes
      ?.map((r) => r.requestedReviewer?.login)
      .filter((login): login is string => !!login) || [];

  const reviewers =
    node.reviews?.nodes?.map((r) => r.author?.login).filter((login): login is string => !!login) ||
    [];

  // Return unique reviewers
  return [...new Set([...requestedReviewers, ...reviewers])];
}

/**
 * Verify GitHub webhook signature
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature = signature.slice(7);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const computedSignature = signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return computedSignature === expectedSignature;
}

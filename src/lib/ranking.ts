/**
 * Feed ranking algorithms for trending posts.
 * Combines multi-signal engagement with a gravity time-decay function
 * and velocity bonuses for breaking viral discussions.
 */

export interface RankablePost {
  id: string;
  createdAt: Date | string;
  shareCount?: number | null;
  _count?: {
    likes?: number;
    comments?: number;
    bookmarks?: number;
    reposts?: number;
  } | null;
  likes?: any[];
  comments?: any[];
  bookmarks?: any[];
  reactions?: any[];
  reactionCounts?: Array<{ count: number }> | any[];
  reposts?: any[];
  [key: string]: any;
}

export interface RankingWeights {
  like: number;
  reaction: number;
  comment: number;
  repost: number;
  bookmark: number;
  share: number;
}

export interface RankingConfig {
  weights?: Partial<RankingWeights>;
  gravity?: number;
  timeOffsetHours?: number;
  velocityThresholdHours?: number;
  velocityMinInteractions?: number;
  velocityBonus?: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  like: 1.0,
  reaction: 1.2,
  comment: 2.5,
  repost: 3.0,
  bookmark: 2.0,
  share: 2.5,
};

export const DEFAULT_RANKING_CONFIG: Required<RankingConfig> = {
  weights: DEFAULT_RANKING_WEIGHTS,
  gravity: 1.5,
  timeOffsetHours: 2.0,
  velocityThresholdHours: 6.0,
  velocityMinInteractions: 3,
  velocityBonus: 5.0,
};

/**
 * Calculates the trending score for a single post.
 */
export function calculateTrendingScore(
  post: RankablePost,
  customConfig?: RankingConfig
): number {
  const config = {
    ...DEFAULT_RANKING_CONFIG,
    ...customConfig,
    weights: {
      ...DEFAULT_RANKING_WEIGHTS,
      ...(customConfig?.weights || {}),
    },
  };

  const likes = post._count?.likes ?? post.likes?.length ?? 0;
  const comments = post._count?.comments ?? post.comments?.length ?? 0;
  const bookmarks = post._count?.bookmarks ?? post.bookmarks?.length ?? 0;
  const reposts = post._count?.reposts ?? post.reposts?.length ?? 0;
  const shares = post.shareCount ?? 0;

  // Calculate reactions count
  let reactions = 0;
  if (Array.isArray(post.reactionCounts) && post.reactionCounts.length > 0) {
    reactions = post.reactionCounts.reduce(
      (acc: number, curr: any) => acc + (typeof curr.count === "number" ? curr.count : 0),
      0
    );
  } else if (Array.isArray(post.reactions)) {
    reactions = post.reactions.length;
  }

  const w = config.weights;
  const engagementScore =
    likes * w.like +
    reactions * w.reaction +
    comments * w.comment +
    reposts * w.repost +
    bookmarks * w.bookmark +
    shares * w.share;

  const totalInteractions = likes + reactions + comments + reposts + bookmarks + shares;

  // Time decay calculation
  const postDate = new Date(post.createdAt).getTime();
  const now = Date.now();
  const ageHours = Math.max(0, (now - postDate) / (1000 * 60 * 60));

  // Velocity bonus for rapid engagement on new content
  const isHighVelocity =
    ageHours <= config.velocityThresholdHours &&
    totalInteractions >= config.velocityMinInteractions;

  const bonus = isHighVelocity ? config.velocityBonus : 0;

  // Gravity decay denominator: (age + offset)^gravity
  const decay = Math.pow(ageHours + config.timeOffsetHours, config.gravity);

  const finalScore = (engagementScore + bonus + 1) / Math.max(decay, 0.001);
  return Number(finalScore.toFixed(4));
}

/**
 * Ranks an array of posts by trending score in descending order.
 */
export function rankTrendingPosts<T extends RankablePost>(
  posts: T[],
  config?: RankingConfig
): Array<T & { trendingScore: number }> {
  return posts
    .map((post) => ({
      ...post,
      trendingScore: calculateTrendingScore(post, config),
    }))
    .sort((a, b) => b.trendingScore - a.trendingScore);
}

/**
 * Returns a detailed score breakdown for debugging and analytics.
 */
export function getTrendingScoreBreakdown(
  post: RankablePost,
  customConfig?: RankingConfig
) {
  const config = {
    ...DEFAULT_RANKING_CONFIG,
    ...customConfig,
    weights: {
      ...DEFAULT_RANKING_WEIGHTS,
      ...(customConfig?.weights || {}),
    },
  };

  const likes = post._count?.likes ?? post.likes?.length ?? 0;
  const comments = post._count?.comments ?? post.comments?.length ?? 0;
  const bookmarks = post._count?.bookmarks ?? post.bookmarks?.length ?? 0;
  const reposts = post._count?.reposts ?? post.reposts?.length ?? 0;
  const shares = post.shareCount ?? 0;

  let reactions = 0;
  if (Array.isArray(post.reactionCounts) && post.reactionCounts.length > 0) {
    reactions = post.reactionCounts.reduce(
      (acc: number, curr: any) => acc + (typeof curr.count === "number" ? curr.count : 0),
      0
    );
  } else if (Array.isArray(post.reactions)) {
    reactions = post.reactions.length;
  }

  const w = config.weights;
  const engagementScore =
    likes * w.like +
    reactions * w.reaction +
    comments * w.comment +
    reposts * w.repost +
    bookmarks * w.bookmark +
    shares * w.share;

  const totalInteractions = likes + reactions + comments + reposts + bookmarks + shares;
  const postDate = new Date(post.createdAt).getTime();
  const ageHours = Math.max(0, (Date.now() - postDate) / (1000 * 60 * 60));

  const isHighVelocity =
    ageHours <= config.velocityThresholdHours &&
    totalInteractions >= config.velocityMinInteractions;
  const bonus = isHighVelocity ? config.velocityBonus : 0;
  const decay = Math.pow(ageHours + config.timeOffsetHours, config.gravity);
  const finalScore = Number(((engagementScore + bonus + 1) / Math.max(decay, 0.001)).toFixed(4));

  return {
    metrics: {
      likes,
      comments,
      reactions,
      reposts,
      bookmarks,
      shares,
      totalInteractions,
    },
    weights: w,
    engagementScore,
    ageHours: Number(ageHours.toFixed(2)),
    velocityBonusApplied: isHighVelocity,
    bonus,
    decay: Number(decay.toFixed(2)),
    finalScore,
  };
}

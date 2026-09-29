export type SortOption = 'Best' | 'Hot' | 'New' | 'Top' | 'Rising';
export type VoteState = 'up' | 'down' | null;

export interface CommunityProfile {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  colorSoft: string;
  category: string;
  description: string;
  members: number;
  online: number;
  created: string;
  subscribed: boolean;
  rules: string[];
  tone: string;
  vocabulary: string[];
  typicalUsers: string;
  commonTopics: string[];
  preferredFormats: string[];
  typicalLength: string;
  commentStyle: string;
  commonOpinions: string[];
  recurringThemes: string[];
  contentToAvoid: string[];
  moderationStyle: string;
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  body: string;
  score: number;
  time: string;
  isOp?: boolean;
  isMod?: boolean;
  replies?: Comment[];
}

export interface Post {
  id: string;
  communityId: string;
  author: string;
  avatar: string;
  title: string;
  body?: string;
  flair?: string;
  flairColor?: string;
  score: number;
  comments: number;
  time: string;
  type: 'text' | 'image' | 'link' | 'poll';
  image?: string;
  imageAlt?: string;
  domain?: string;
  readTime?: string;
  trend?: 'rising' | 'hot';
  commentTree?: Comment[];
  pollOptions?: { label: string; votes: number }[];
}

export type Page =
  | { type: 'home' }
  | { type: 'explore' }
  | { type: 'community'; id: string }
  | { type: 'post'; id: string }
  | { type: 'saved' }
  | { type: 'profile' }
  | { type: 'settings' }
  | { type: 'search'; query: string };

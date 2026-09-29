import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowUp, Bell, BellRing, Bookmark, BookmarkCheck, Check, ChevronDown,
  CircleHelp, Clock3, Compass, Copy, Ellipsis, Eye, FileText, Flame, Home, Image as ImageIcon,
  Info, LayoutGrid, Link2, ListFilter, LoaderCircle, Menu, MessageCircle, Moon, MoreHorizontal,
  PenLine, Plus, Search, Send, Settings, Share2, ShieldCheck, Sparkles, Sun, TrendingUp, Trophy,
  User, Users, X, Zap
} from 'lucide-react';
import { categoryIcons, communities, currentUser, seedPosts, trendingTopics } from './data';
import { generateCommunityPosts, generateFeedBatch, getGenerationContext } from './services/contentEngine';
import type { Comment, CommunityProfile, Page, Post, SortOption, VoteState } from './types';
import './styles.css';

const sortOptions: { name: SortOption; icon: ReactNode }[] = [
  { name: 'Best', icon: <Sparkles size={16} /> },
  { name: 'Hot', icon: <Flame size={16} /> },
  { name: 'New', icon: <Clock3 size={16} /> },
  { name: 'Top', icon: <Trophy size={16} /> },
  { name: 'Rising', icon: <TrendingUp size={16} /> },
];

const formatCount = (value: number) => value >= 1_000_000
  ? `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`
  : value >= 1000 ? `${(value / 1000).toFixed(value >= 100_000 ? 0 : 1)}k` : value.toString();

const communityFor = (id: string) => communities.find(c => c.id === id) || communities[0];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Fora home">
      <span className="brand-mark"><span className="brand-orbit" /></span>
      {!compact && <span className="brand-word">fora</span>}
    </div>
  );
}

function CommunityAvatar({ community, size = 'md' }: { community: CommunityProfile; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <span className={`community-avatar avatar-${size}`} style={{ background: community.colorSoft, color: community.color }}>
      {community.icon}
    </span>
  );
}

function UserAvatar({ initials, size = 'md', online = false }: { initials: string; size?: 'sm' | 'md' | 'lg'; online?: boolean }) {
  return <span className={`user-avatar avatar-${size}`}>{initials}{online && <i className="online-dot" />}</span>;
}

function RichBody({ text, compact = false }: { text: string; compact?: boolean }) {
  const lines = text.split('\n').filter((line, i, array) => line.trim() || (i > 0 && array[i - 1].trim()));
  return (
    <div className={compact ? 'post-body post-body-clamp' : 'post-body'}>
      {lines.map((line, lineIndex) => {
        const pieces = line.split(/(\*\*[^*]+\*\*)/g);
        return <p key={lineIndex}>{pieces.map((piece, i) => piece.startsWith('**') ? <strong key={i}>{piece.slice(2, -2)}</strong> : piece)}</p>;
      })}
    </div>
  );
}

function Header({
  page, navigate, onCreate, theme, setTheme, sidebarOpen, setSidebarOpen, notify
}: {
  page: Page; navigate: (page: Page) => void; onCreate: () => void; theme: string; setTheme: (value: 'light' | 'dark') => void;
  sidebarOpen: boolean; setSidebarOpen: (value: boolean) => void; notify: (message: string) => void;
}) {
  const [query, setQuery] = useState(page.type === 'search' ? page.query : '');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    if (page.type === 'search') setQuery(page.query);
  }, [page]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) navigate({ type: 'search', query: query.trim() });
  };

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Open navigation"><Menu size={22} /></button>
        <button className="brand-button" onClick={() => navigate({ type: 'home' })}><Brand /></button>
        <form className="searchbar" onSubmit={submitSearch}>
          <Search size={19} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search communities and conversations" aria-label="Search" />
          <kbd>⌘ K</kbd>
        </form>
        <div className="top-actions">
          <button className="icon-button theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle theme">
            {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
          </button>
          <div className="popover-wrap">
            <button className="icon-button has-indicator" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Notifications">
              <Bell size={20} /><span className="notification-dot" />
            </button>
            {notificationsOpen && (
              <div className="popover notifications-popover">
                <div className="popover-head"><div><h3>Notifications</h3><span>3 unread</span></div><button className="text-button" onClick={() => notify('All caught up — notifications marked as read')}>Mark all read</button></div>
                <button className="notification-row" onClick={() => { navigate({ type: 'post', id: 'p1' }); setNotificationsOpen(false); }}>
                  <span className="notification-icon reply"><MessageCircle size={17} /></span><span><b>null_reference</b> replied to a thread you follow in <strong>c/devcraft</strong><small>18 min ago</small></span>
                </button>
                <button className="notification-row" onClick={() => { navigate({ type: 'community', id: 'pocketwisdom' }); setNotificationsOpen(false); }}>
                  <span className="notification-icon trend"><TrendingUp size={17} /></span><span>Your post in <strong>c/pocketwisdom</strong> reached 500 upvotes<small>2 hours ago</small></span>
                </button>
                <button className="notification-row read" onClick={() => setNotificationsOpen(false)}>
                  <span className="notification-icon award"><Trophy size={17} /></span><span>You earned the <strong>Good Neighbor</strong> badge<small>Yesterday</small></span>
                </button>
              </div>
            )}
          </div>
          <button className="create-button" onClick={onCreate}><Plus size={18} /><span>Create</span></button>
          <button className="profile-button" onClick={() => navigate({ type: 'profile' })} aria-label="Open profile"><UserAvatar initials={currentUser.avatar} online /><span className="profile-name"><b>{currentUser.name}</b><small>{formatCount(currentUser.karma)} karma</small></span><ChevronDown size={15} /></button>
        </div>
      </div>
    </header>
  );
}

function Sidebar({
  page, navigate, subscribed, open, setOpen
}: { page: Page; navigate: (page: Page) => void; subscribed: Set<string>; open: boolean; setOpen: (value: boolean) => void }) {
  const nav = (next: Page) => { navigate(next); setOpen(false); };
  const is = (type: Page['type']) => page.type === type;
  const subscribedCommunities = communities.filter(c => subscribed.has(c.id)).slice(0, 8);
  return (
    <>
      {open && <button className="sidebar-backdrop" onClick={() => setOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <nav className="sidebar-nav">
          <div className="nav-group primary-nav">
            <button className={is('home') ? 'active' : ''} onClick={() => nav({ type: 'home' })}><Home /><span>Home</span></button>
            <button className={is('explore') ? 'active' : ''} onClick={() => nav({ type: 'explore' })}><Compass /><span>Discover</span><span className="nav-badge">New</span></button>
            <button className={is('saved') ? 'active' : ''} onClick={() => nav({ type: 'saved' })}><Bookmark /><span>Saved</span></button>
          </div>
          <div className="nav-separator" />
          <div className="nav-group">
            <div className="nav-label"><span>Your communities</span><button onClick={() => nav({ type: 'explore' })} aria-label="Find communities"><Plus size={15} /></button></div>
            {subscribedCommunities.map(community => (
              <button key={community.id} className={page.type === 'community' && page.id === community.id ? 'active' : ''} onClick={() => nav({ type: 'community', id: community.id })}>
                <CommunityAvatar community={community} size="sm" /><span>{community.name}</span>{community.online > 3000 && <i className="live-dot" />}
              </button>
            ))}
            <button className="muted-nav" onClick={() => nav({ type: 'explore' })}><LayoutGrid /><span>Browse all communities</span></button>
          </div>
          <div className="nav-separator" />
          <div className="nav-group utility-nav">
            <button className={is('profile') ? 'active' : ''} onClick={() => nav({ type: 'profile' })}><User /><span>Profile</span></button>
            <button className={is('settings') ? 'active' : ''} onClick={() => nav({ type: 'settings' })}><Settings /><span>Settings</span></button>
            <button onClick={() => nav({ type: 'settings' })}><CircleHelp /><span>Help & feedback</span></button>
          </div>
        </nav>
        <div className="sidebar-footer"><span>Fora © 2026</span><span><button>Guidelines</button> · <button>Privacy</button></span></div>
      </aside>
    </>
  );
}

function SortBar({ sort, setSort, compact = false }: { sort: SortOption; setSort: (sort: SortOption) => void; compact?: boolean }) {
  return (
    <div className={`sortbar ${compact ? 'sortbar-compact' : ''}`}>
      <div className="sort-options">
        {sortOptions.map(option => <button key={option.name} className={sort === option.name ? 'active' : ''} onClick={() => setSort(option.name)}>{option.icon}<span>{option.name}</span></button>)}
      </div>
      {!compact && <button className="sort-layout" aria-label="Feed layout"><ListFilter size={17} /><ChevronDown size={13} /></button>}
    </div>
  );
}

function PostCard({
  post, onOpen, onCommunity, vote, onVote, saved, onSave, notify
}: {
  post: Post; onOpen: () => void; onCommunity: () => void; vote: VoteState; onVote: (vote: VoteState) => void; saved: boolean; onSave: () => void; notify: (message: string) => void;
}) {
  const community = communityFor(post.communityId);
  const adjustedScore = post.score + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0);
  const click = (event: React.MouseEvent, action: () => void) => { event.stopPropagation(); action(); };
  return (
    <article className="post-card" onClick={onOpen} tabIndex={0} onKeyDown={event => event.key === 'Enter' && onOpen()}>
      <div className="vote-rail" onClick={event => event.stopPropagation()}>
        <button className={vote === 'up' ? 'voted-up' : ''} onClick={() => onVote(vote === 'up' ? null : 'up')} aria-label="Upvote"><ArrowUp size={19} /></button>
        <strong>{formatCount(adjustedScore)}</strong>
        <button className={vote === 'down' ? 'voted-down' : ''} onClick={() => onVote(vote === 'down' ? null : 'down')} aria-label="Downvote"><ArrowDown size={19} /></button>
      </div>
      <div className="post-main">
        <div className="post-meta">
          <button className="post-community" onClick={event => click(event, onCommunity)}><CommunityAvatar community={community} size="sm" /><b>{community.name}</b></button>
          <span>·</span><span>Posted by u/{post.author}</span><span>·</span><span>{post.time}</span>
          {post.trend === 'rising' && <span className="trend-label"><TrendingUp size={13} /> Rising</span>}
        </div>
        <h2 className="post-title">{post.title}</h2>
        <div className="post-tags">
          {post.flair && <span className="flair" style={{ background: `${post.flairColor}16`, color: post.flairColor }}>{post.flair}</span>}
          {post.readTime && <span className="read-time">{post.readTime}</span>}
          {post.domain && <span className="link-domain"><Link2 size={11} />{post.domain}</span>}
        </div>
        {post.body && post.type !== 'image' && <RichBody text={post.body} compact />}
        {post.image && <div className="post-image-wrap"><img className="post-image" src={post.image} alt={post.imageAlt || ''} loading="lazy" /><span className="image-badge"><ImageIcon size={14} /> Original photo</span></div>}
        {post.pollOptions && <div className="poll-compact">{post.pollOptions.slice(0, 3).map(option => <div key={option.label}><span>{option.label}</span><i style={{ width: `${Math.max(8, option.votes / 20)}%` }} /></div>)}</div>}
        <div className="post-actions" onClick={event => event.stopPropagation()}>
          <button onClick={onOpen}><MessageCircle size={17} /><span>{formatCount(post.comments)} comments</span></button>
          <div className="mobile-score"><ArrowUp size={16} /><b>{formatCount(adjustedScore)}</b></div>
          <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/post/${post.id}`); notify('Link copied to clipboard'); }}><Share2 size={17} /><span>Share</span></button>
          <button className={saved ? 'saved-action' : ''} onClick={onSave}>{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}<span>{saved ? 'Saved' : 'Save'}</span></button>
          <button className="more-action" onClick={() => notify('More post actions')}><MoreHorizontal size={18} /></button>
        </div>
      </div>
    </article>
  );
}

function PostSkeleton() {
  return <div className="post-card skeleton-card"><div className="skeleton-vote" /><div className="skeleton-content"><div className="skeleton-line w40" /><div className="skeleton-line title-line" /><div className="skeleton-line w90" /><div className="skeleton-line w70" /><div className="skeleton-actions" /></div></div>;
}

function Feed({
  posts, sort, setSort, navigate, votes, setVote, saved, toggleSaved, notify, loading, loadingMore, sentinelRef, heading
}: {
  posts: Post[]; sort: SortOption; setSort: (sort: SortOption) => void; navigate: (page: Page) => void;
  votes: Record<string, VoteState>; setVote: (id: string, value: VoteState) => void; saved: Set<string>; toggleSaved: (id: string) => void;
  notify: (message: string) => void; loading: boolean; loadingMore?: boolean; sentinelRef?: React.RefObject<HTMLDivElement | null>; heading?: string;
}) {
  return (
    <div className="feed-column">
      {heading && <div className="section-heading"><h2>{heading}</h2><span>Curated for your communities</span></div>}
      <SortBar sort={sort} setSort={setSort} />
      {loading ? <><PostSkeleton /><PostSkeleton /><PostSkeleton /></> : posts.length ? posts.map(post => (
        <PostCard key={post.id} post={post} onOpen={() => navigate({ type: 'post', id: post.id })} onCommunity={() => navigate({ type: 'community', id: post.communityId })}
          vote={votes[post.id] || null} onVote={value => setVote(post.id, value)} saved={saved.has(post.id)} onSave={() => toggleSaved(post.id)} notify={notify} />
      )) : <EmptyState icon={<FileText />} title="No conversations here yet" text="Follow a few communities or change the current filter." action="Discover communities" onAction={() => navigate({ type: 'explore' })} />}
      {sentinelRef && <div ref={sentinelRef} className="feed-sentinel">{loadingMore ? <><LoaderCircle className="spin" size={20} /><span>Finding more good conversations…</span></> : <span>Keep scrolling</span>}</div>}
    </div>
  );
}

function DailyMix() {
  return (
    <div className="daily-mix">
      <div><span className="eyebrow"><Sparkles size={14} /> Your daily mix</span><h1>Good conversations,<br />picked for you.</h1><p>Fresh from the communities you follow, without the noise.</p></div>
      <div className="mix-visual" aria-hidden="true"><span className="mix-ring ring-one" /><span className="mix-ring ring-two" /><span className="mix-card card-a">⌘</span><span className="mix-card card-b">✦</span><span className="mix-card card-c">↗</span></div>
    </div>
  );
}

function RightRail({ navigate, subscribed, toggleSubscribe }: { navigate: (page: Page) => void; subscribed: Set<string>; toggleSubscribe: (id: string) => void }) {
  const suggestions = communities.filter(c => !subscribed.has(c.id)).slice(0, 4);
  return (
    <aside className="right-rail">
      <section className="rail-card">
        <div className="rail-heading"><h3>Communities to explore</h3><button onClick={() => navigate({ type: 'explore' })}>See all</button></div>
        <div className="community-list">
          {suggestions.map(community => <div className="community-row" key={community.id}>
            <button className="community-row-main" onClick={() => navigate({ type: 'community', id: community.id })}><CommunityAvatar community={community} /><span><b>{community.name}</b><small>{formatCount(community.members)} members</small></span></button>
            <button className="join-small" onClick={() => toggleSubscribe(community.id)}>Join</button>
          </div>)}
        </div>
      </section>
      <section className="rail-card">
        <div className="rail-heading"><h3>Trending today</h3><TrendingUp size={17} /></div>
        <div className="trending-list">
          {trendingTopics.map((topic, index) => <button key={topic.tag} onClick={() => navigate({ type: 'search', query: topic.tag })}><span className="trend-number">{String(index + 1).padStart(2, '0')}</span><span><b>{topic.tag}</b><small>{topic.community} · {topic.posts}</small></span><ChevronDown className="trend-arrow" size={16} /></button>)}
        </div>
      </section>
      <div className="rail-note"><ShieldCheck size={16} /><span>Generated conversations are safety checked and shaped by each community’s culture.</span></div>
      <div className="rail-links"><button>About</button><button>Guidelines</button><button>Privacy</button><button>Terms</button><span>Fora © 2026</span></div>
    </aside>
  );
}

function EmptyState({ icon, title, text, action, onAction }: { icon: ReactNode; title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h2>{title}</h2><p>{text}</p>{action && <button className="primary-button" onClick={onAction}>{action}</button>}</div>;
}

function HomePage(props: {
  allPosts: Post[]; sort: SortOption; setSort: (sort: SortOption) => void; navigate: (page: Page) => void; votes: Record<string, VoteState>; setVote: (id: string, value: VoteState) => void; saved: Set<string>; toggleSaved: (id: string) => void; notify: (message: string) => void; subscribed: Set<string>; toggleSubscribe: (id: string) => void; loading: boolean; loadingMore: boolean; sentinelRef: React.RefObject<HTMLDivElement | null>;
}) {
  const posts = useMemo(() => sortPosts(props.allPosts.filter(post => props.subscribed.has(post.communityId)), props.sort), [props.allPosts, props.subscribed, props.sort]);
  return <div className="page-grid home-grid"><main><DailyMix /><Feed {...props} posts={posts} /></main><RightRail navigate={props.navigate} subscribed={props.subscribed} toggleSubscribe={props.toggleSubscribe} /></div>;
}

function sortPosts(posts: Post[], sort: SortOption) {
  const copy = [...posts];
  if (sort === 'Top') return copy.sort((a, b) => b.score - a.score);
  if (sort === 'Rising') return copy.sort((a, b) => Number(b.trend === 'rising') - Number(a.trend === 'rising') || b.score - a.score);
  if (sort === 'Hot') return copy.sort((a, b) => Number(b.trend === 'hot') - Number(a.trend === 'hot') || b.comments - a.comments);
  if (sort === 'New') return copy.sort((a, b) => parseTime(a.time) - parseTime(b.time));
  return copy.sort((a, b) => (b.score * 0.72 + b.comments * 2.1) - (a.score * 0.72 + a.comments * 2.1));
}

function parseTime(time: string) {
  const value = parseInt(time) || 1;
  if (time.includes('m')) return value;
  if (time.includes('h')) return value * 60;
  return value * 1440;
}

function CommunityPage({ community, allPosts, sort, setSort, navigate, votes, setVote, saved, toggleSaved, notify, subscribed, toggleSubscribe, loading }: {
  community: CommunityProfile; allPosts: Post[]; sort: SortOption; setSort: (sort: SortOption) => void; navigate: (page: Page) => void; votes: Record<string, VoteState>; setVote: (id: string, value: VoteState) => void; saved: Set<string>; toggleSaved: (id: string) => void; notify: (message: string) => void; subscribed: Set<string>; toggleSubscribe: (id: string) => void; loading: boolean;
}) {
  const [tab, setTab] = useState<'posts' | 'about'>('posts');
  const posts = sortPosts(allPosts.filter(post => post.communityId === community.id), sort);
  const context = getGenerationContext(community);
  return (
    <div className="community-page">
      <section className="community-hero" style={{ '--community': community.color, '--community-soft': community.colorSoft } as React.CSSProperties}>
        <div className="community-banner"><span className="banner-symbol symbol-one">{community.icon}</span><span className="banner-symbol symbol-two">{community.icon}</span><span className="banner-grid" /></div>
        <div className="community-identity">
          <CommunityAvatar community={community} size="xl" />
          <div className="community-name"><div className="community-title-row"><h1>{community.displayName}</h1><span className="verified"><Check size={12} /></span></div><p>{community.name}</p></div>
          <div className="community-stats"><span><b>{formatCount(community.members)}</b><small>members</small></span><i /><span><b>{formatCount(community.online)}</b><small><i className="online-inline" /> online</small></span></div>
          <button className={subscribed.has(community.id) ? 'joined-button' : 'join-button'} onClick={() => toggleSubscribe(community.id)}>{subscribed.has(community.id) ? <><Check size={17} /> Joined</> : <><Plus size={17} /> Join community</>}</button>
          <button className="icon-button community-more" onClick={() => notify('Community options')}><Ellipsis size={20} /></button>
        </div>
        <div className="community-tabs"><button className={tab === 'posts' ? 'active' : ''} onClick={() => setTab('posts')}>Posts</button><button className={tab === 'about' ? 'active' : ''} onClick={() => setTab('about')}>About</button></div>
      </section>
      <div className="community-layout">
        <main>
          {tab === 'posts' ? <Feed posts={posts} sort={sort} setSort={setSort} navigate={navigate} votes={votes} setVote={setVote} saved={saved} toggleSaved={toggleSaved} notify={notify} loading={loading} /> : (
            <section className="community-about-mobile surface-card"><h2>About this community</h2><p>{community.description}</p><ProfileDetails community={community} context={context} /></section>
          )}
        </main>
        <aside className="community-sidebar">
          <section className="surface-card about-card"><div className="card-title"><Info size={18} /><h3>About this community</h3></div><p>{community.description}</p><div className="about-meta"><span><Users size={16} /> Created {community.created}</span><span><ShieldCheck size={16} /> {community.moderationStyle}</span></div></section>
          <section className="surface-card rules-card"><div className="card-title"><ShieldCheck size={18} /><h3>Community rules</h3></div><ol>{community.rules.map((rule, index) => <li key={rule}><span>{index + 1}</span><p>{rule}</p></li>)}</ol></section>
          <section className="surface-card culture-card"><div className="card-title"><Sparkles size={18} /><h3>Community culture</h3></div><div className="culture-chips">{community.commonTopics.slice(0, 5).map(topic => <span key={topic}>{topic}</span>)}</div><p><b>Tone:</b> {community.tone}</p></section>
        </aside>
      </div>
    </div>
  );
}

function ProfileDetails({ community, context }: { community: CommunityProfile; context: ReturnType<typeof getGenerationContext> }) {
  return <div className="profile-details">
    <div><h4>Who is here</h4><p>{community.typicalUsers}</p></div><div><h4>How people post</h4><p>{community.preferredFormats.join(' · ')}</p></div><div><h4>Conversation style</h4><p>{context.commentCulture}</p></div><div><h4>Content standards</h4><p>{community.contentToAvoid.join(' · ')}</p></div>
  </div>;
}

function CommentItem({ comment, depth = 0, onReply }: { comment: Comment; depth?: number; onReply: (parentId: string, text: string) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');
  const submit = () => { if (!reply.trim()) return; onReply(comment.id, reply.trim()); setReply(''); setReplying(false); };
  return (
    <div className={`comment depth-${Math.min(depth, 3)} ${collapsed ? 'comment-collapsed' : ''}`}>
      <div className="comment-line" onClick={() => setCollapsed(!collapsed)} />
      <div className="comment-head"><UserAvatar initials={comment.avatar} size="sm" /><b>{comment.author}</b>{comment.isOp && <span className="op-badge">OP</span>}{comment.isMod && <span className="mod-badge">MOD</span>}<span>· {comment.time}</span><button className="collapse-comment" onClick={() => setCollapsed(!collapsed)}>{collapsed ? `[+${(comment.replies?.length || 0) + 1}]` : '–'}</button></div>
      {!collapsed && <>
        <p className="comment-body">{comment.body}</p>
        <div className="comment-actions"><button><ArrowUp size={15} /></button><b>{formatCount(comment.score)}</b><button><ArrowDown size={15} /></button><button onClick={() => setReplying(!replying)}><MessageCircle size={14} /> Reply</button><button><Trophy size={14} /> Award</button><button><MoreHorizontal size={15} /></button></div>
        {replying && <div className="inline-reply"><UserAvatar initials={currentUser.avatar} size="sm" /><div><textarea autoFocus value={reply} onChange={event => setReply(event.target.value)} placeholder={`Reply to ${comment.author}`} /><div><button className="secondary-button" onClick={() => setReplying(false)}>Cancel</button><button className="primary-button small" onClick={submit}><Send size={14} /> Reply</button></div></div></div>}
        {comment.replies?.map(child => <CommentItem key={child.id} comment={child} depth={depth + 1} onReply={onReply} />)}
      </>}
    </div>
  );
}

function PostDetail({ post, navigate, vote, onVote, saved, onSave, notify, onComment, onReply, subscribed, toggleSubscribe }: {
  post: Post; navigate: (page: Page) => void; vote: VoteState; onVote: (value: VoteState) => void; saved: boolean; onSave: () => void; notify: (message: string) => void; onComment: (text: string) => void; onReply: (parentId: string, text: string) => void; subscribed: Set<string>; toggleSubscribe: (id: string) => void;
}) {
  const community = communityFor(post.communityId);
  const [comment, setComment] = useState('');
  const [commentSort, setCommentSort] = useState('Best');
  const submitComment = () => { if (!comment.trim()) return; onComment(comment.trim()); setComment(''); notify('Your comment is now live'); };
  return (
    <div className="post-page">
      <button className="back-button" onClick={() => navigate({ type: 'home' })}><ArrowLeft size={17} /> Back to feed</button>
      <div className="post-layout">
        <main>
          <article className="post-detail-card">
            <div className="detail-community-row"><button onClick={() => navigate({ type: 'community', id: community.id })}><CommunityAvatar community={community} /><span><b>{community.name}</b><small>Posted by u/{post.author} · {post.time}</small></span></button><button className={subscribed.has(community.id) ? 'joined-button small-button' : 'join-small'} onClick={() => toggleSubscribe(community.id)}>{subscribed.has(community.id) ? 'Joined' : 'Join'}</button></div>
            <div className="detail-vote"><button className={vote === 'up' ? 'voted-up' : ''} onClick={() => onVote(vote === 'up' ? null : 'up')}><ArrowUp /></button><b>{formatCount(post.score + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0))}</b><button className={vote === 'down' ? 'voted-down' : ''} onClick={() => onVote(vote === 'down' ? null : 'down')}><ArrowDown /></button></div>
            <div className="detail-content">
              <div className="post-tags">{post.flair && <span className="flair" style={{ background: `${post.flairColor}16`, color: post.flairColor }}>{post.flair}</span>}{post.readTime && <span className="read-time">{post.readTime}</span>}</div>
              <h1>{post.title}</h1>
              {post.body && <RichBody text={post.body} />}
              {post.image && <div className="detail-image"><img src={post.image} alt={post.imageAlt || ''} /></div>}
              <div className="detail-actions"><button><MessageCircle size={17} /> {formatCount(post.comments)} comments</button><button onClick={() => { navigator.clipboard?.writeText(window.location.href); notify('Link copied to clipboard'); }}><Share2 size={17} /> Share</button><button className={saved ? 'saved-action' : ''} onClick={onSave}>{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />} {saved ? 'Saved' : 'Save'}</button><button onClick={() => notify('More post actions')}><MoreHorizontal size={18} /></button></div>
            </div>
          </article>
          <section className="comments-card">
            <div className="comment-composer"><UserAvatar initials={currentUser.avatar} /><div><textarea value={comment} onChange={event => setComment(event.target.value)} placeholder="Add to the conversation" /><div className="composer-bottom"><span><ShieldCheck size={14} /> Remember the human</span><button className="primary-button small" disabled={!comment.trim()} onClick={submitComment}><Send size={14} /> Comment</button></div></div></div>
            <div className="comments-head"><h2>Comments <span>{formatCount(post.comments)}</span></h2><div className="comment-sort">Sort by <button onClick={() => setCommentSort(commentSort === 'Best' ? 'New' : 'Best')}>{commentSort} <ChevronDown size={13} /></button></div></div>
            <div className="comment-tree">{post.commentTree?.length ? post.commentTree.map(item => <CommentItem key={item.id} comment={item} onReply={onReply} />) : <EmptyState icon={<MessageCircle />} title="Start the conversation" text="Be the first person to share a thoughtful reply." />}</div>
          </section>
        </main>
        <aside className="post-side">
          <section className="surface-card post-community-card" style={{ '--community': community.color } as React.CSSProperties}><div className="side-cover" /><CommunityAvatar community={community} size="lg" /><h3>{community.displayName}</h3><p>{community.description}</p><div><span><b>{formatCount(community.members)}</b><small>members</small></span><span><b>{formatCount(community.online)}</b><small>online</small></span></div><button className="secondary-button full" onClick={() => navigate({ type: 'community', id: community.id })}>Visit community</button></section>
          <section className="surface-card"><div className="card-title"><ShieldCheck size={18} /><h3>Keep it thoughtful</h3></div><p className="side-copy">Disagree with ideas, not people. Add context, stay curious, and upvote useful contributions.</p></section>
        </aside>
      </div>
    </div>
  );
}

function ExplorePage({ navigate, subscribed, toggleSubscribe }: { navigate: (page: Page) => void; subscribed: Set<string>; toggleSubscribe: (id: string) => void }) {
  const [category, setCategory] = useState('All');
  const categories = ['All', ...Array.from(new Set(communities.map(c => c.category)))];
  const filtered = category === 'All' ? communities : communities.filter(c => c.category === category);
  const featured = communities.slice(6, 9);
  return (
    <div className="wide-page explore-page">
      <section className="explore-hero"><div><span className="eyebrow"><Compass size={14} /> Find your corner</span><h1>There is a community<br />for that.</h1><p>From deep technical dives to tiny daily wins, find people who care about the same oddly specific things you do.</p></div><div className="explore-cloud">{communities.slice(0, 9).map((c, i) => <button key={c.id} style={{ '--x': `${(i * 31) % 80}%`, '--y': `${(i * 43) % 76}%`, '--delay': `${i * -.4}s`, background: c.colorSoft, color: c.color } as React.CSSProperties} onClick={() => navigate({ type: 'community', id: c.id })}>{c.icon}</button>)}</div></section>
      <section className="featured-section"><div className="section-title"><div><span>Featured this week</span><h2>Communities worth wandering into</h2></div><button className="text-button">Refresh picks <Zap size={14} /></button></div><div className="featured-grid">{featured.map((community, index) => <article key={community.id} className="featured-community" style={{ '--community': community.color, '--community-soft': community.colorSoft } as React.CSSProperties}><div className="featured-cover"><span>{categoryIcons[community.category]}</span><i>{community.icon}</i></div><div className="featured-body"><CommunityAvatar community={community} size="lg" /><h3>{community.displayName}</h3><span>{community.name} · {formatCount(community.members)} members</span><p>{community.description}</p><div><button className="secondary-button" onClick={() => navigate({ type: 'community', id: community.id })}>Explore</button><button className={subscribed.has(community.id) ? 'joined-button' : 'join-button'} onClick={() => toggleSubscribe(community.id)}>{subscribed.has(community.id) ? 'Joined' : 'Join'}</button></div></div></article>)}</div></section>
      <section className="all-communities"><div className="section-title"><div><span>Browse all</span><h2>Explore communities</h2></div></div><div className="category-scroll">{categories.map(item => <button key={item} className={item === category ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="community-directory">{filtered.map(community => <article key={community.id}><button className="directory-main" onClick={() => navigate({ type: 'community', id: community.id })}><CommunityAvatar community={community} size="lg" /><span><h3>{community.displayName}</h3><b>{community.name}</b><p>{community.description}</p><small><Users size={14} /> {formatCount(community.members)} members <i /> {formatCount(community.online)} online</small></span></button><button className={subscribed.has(community.id) ? 'joined-button' : 'join-small'} onClick={() => toggleSubscribe(community.id)}>{subscribed.has(community.id) ? <><Check size={15} /> Joined</> : 'Join'}</button></article>)}</div></section>
    </div>
  );
}

function SavedPage(props: Omit<Parameters<typeof Feed>[0], 'posts' | 'heading' | 'loading' | 'sort' | 'setSort'> & { allPosts: Post[]; saved: Set<string>; sort: SortOption; setSort: (sort: SortOption) => void }) {
  const posts = props.allPosts.filter(post => props.saved.has(post.id));
  return <div className="center-page"><div className="simple-page-head"><div><span className="eyebrow"><Bookmark size={14} /> Your library</span><h1>Saved conversations</h1><p>The posts you wanted to find again.</p></div><span className="count-pill">{posts.length} saved</span></div>{posts.length ? <Feed {...props} posts={posts} loading={false} /> : <EmptyState icon={<Bookmark />} title="Nothing saved yet" text="Save useful, delightful, or deeply specific posts and they will appear here." action="Browse your feed" onAction={() => props.navigate({ type: 'home' })} />}</div>;
}

function SearchPage({ query, posts, navigate, subscribed, toggleSubscribe, votes, setVote, saved, toggleSaved, notify }: {
  query: string; posts: Post[]; navigate: (page: Page) => void; subscribed: Set<string>; toggleSubscribe: (id: string) => void; votes: Record<string, VoteState>; setVote: (id: string, value: VoteState) => void; saved: Set<string>; toggleSaved: (id: string) => void; notify: (message: string) => void;
}) {
  const q = query.toLowerCase();
  const communityMatches = communities.filter(c => `${c.name} ${c.displayName} ${c.description} ${c.commonTopics.join(' ')}`.toLowerCase().includes(q));
  const postMatches = posts.filter(p => `${p.title} ${p.body || ''} ${communityFor(p.communityId).name}`.toLowerCase().includes(q));
  const [tab, setTab] = useState<'all' | 'posts' | 'communities'>('all');
  return <div className="search-page center-page"><div className="simple-page-head"><div><span className="eyebrow"><Search size={14} /> Search</span><h1>Results for “{query}”</h1><p>{postMatches.length + communityMatches.length} thoughtful matches across Fora</p></div></div><div className="search-tabs"><button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>All</button><button className={tab === 'posts' ? 'active' : ''} onClick={() => setTab('posts')}>Posts</button><button className={tab === 'communities' ? 'active' : ''} onClick={() => setTab('communities')}>Communities</button></div>{(tab === 'all' || tab === 'communities') && communityMatches.length > 0 && <section className="search-communities"><h2>Communities</h2>{communityMatches.slice(0, 4).map(c => <div key={c.id}><button onClick={() => navigate({ type: 'community', id: c.id })}><CommunityAvatar community={c} /><span><b>{c.displayName}</b><small>{c.name} · {formatCount(c.members)} members</small></span></button><button className={subscribed.has(c.id) ? 'joined-button' : 'join-small'} onClick={() => toggleSubscribe(c.id)}>{subscribed.has(c.id) ? 'Joined' : 'Join'}</button></div>)}</section>}{(tab === 'all' || tab === 'posts') && <section><h2 className="search-section-label">Conversations</h2>{postMatches.length ? postMatches.map(post => <PostCard key={post.id} post={post} onOpen={() => navigate({ type: 'post', id: post.id })} onCommunity={() => navigate({ type: 'community', id: post.communityId })} vote={votes[post.id] || null} onVote={value => setVote(post.id, value)} saved={saved.has(post.id)} onSave={() => toggleSaved(post.id)} notify={notify} />) : <EmptyState icon={<Search />} title="No conversations found" text="Try another phrase or browse communities by category." action="Explore communities" onAction={() => navigate({ type: 'explore' })} />}</section>}</div>;
}

function ProfilePage({ navigate, posts }: { navigate: (page: Page) => void; posts: Post[] }) {
  const userPosts = posts.slice(0, 3);
  return <div className="profile-page center-page"><section className="profile-hero"><div className="profile-cover"><span /></div><div className="profile-info"><UserAvatar initials={currentUser.avatar} size="lg" /><div><h1>{currentUser.displayName}</h1><span>u/{currentUser.name}</span><p>{currentUser.bio}</p></div><button className="secondary-button"><PenLine size={16} /> Edit profile</button></div><div className="profile-metrics"><span><b>{formatCount(currentUser.karma)}</b><small>Karma</small></span><span><b>{currentUser.posts}</b><small>Posts</small></span><span><b>{currentUser.comments}</b><small>Comments</small></span><span><b>{currentUser.joined}</b><small>Joined</small></span></div></section><div className="profile-tabs"><button className="active">Overview</button><button>Posts</button><button>Comments</button><button>Awards</button></div><section className="profile-achievement"><span><Trophy size={22} /></span><div><b>Good Neighbor</b><p>Your comments were marked helpful 50 times.</p></div><small>Rare · 8.4% of members</small></section><div className="section-heading"><h2>Recent activity</h2></div>{userPosts.map((post, index) => <button className="activity-row" key={post.id} onClick={() => navigate({ type: 'post', id: post.id })}><span className={index === 1 ? 'comment-activity' : ''}>{index === 1 ? <MessageCircle size={18} /> : <ArrowUp size={18} />}</span><div><small>{index === 1 ? `Commented in ${communityFor(post.communityId).name}` : `Upvoted in ${communityFor(post.communityId).name}`} · {post.time}</small><b>{post.title}</b><p>{index === 1 ? post.commentTree?.[0]?.body : post.body?.slice(0, 150)}…</p></div><ChevronDown size={17} /></button>)}</div>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return <button className={`toggle ${checked ? 'on' : ''}`} onClick={onChange} role="switch" aria-checked={checked}><span /></button>;
}

function SettingsPage({ theme, setTheme, notify }: { theme: string; setTheme: (value: 'light' | 'dark') => void; notify: (message: string) => void }) {
  const [prefs, setPrefs] = useState({ replies: true, trending: true, digest: false, autoplay: false, compact: false });
  const flip = (key: keyof typeof prefs) => setPrefs(value => ({ ...value, [key]: !value[key] }));
  return <div className="settings-page center-page"><div className="simple-page-head"><div><span className="eyebrow"><Settings size={14} /> Preferences</span><h1>Settings</h1><p>Make Fora feel like your place.</p></div></div><section className="settings-section"><h2>Appearance</h2><p>Choose how Fora looks on this device.</p><div className="theme-cards"><button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}><span className="theme-preview light-preview"><i /><i /><i /></span><b><Sun size={16} /> Light</b>{theme === 'light' && <Check size={17} />}</button><button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}><span className="theme-preview dark-preview"><i /><i /><i /></span><b><Moon size={16} /> Dark</b>{theme === 'dark' && <Check size={17} />}</button></div></section><section className="settings-section"><h2>Notifications</h2><SettingsRow title="Replies and mentions" text="When someone responds to you" control={<Toggle checked={prefs.replies} onChange={() => flip('replies')} />} /><SettingsRow title="Trending in your communities" text="Occasional noteworthy conversations" control={<Toggle checked={prefs.trending} onChange={() => flip('trending')} />} /><SettingsRow title="Weekly digest" text="A quiet roundup delivered by email" control={<Toggle checked={prefs.digest} onChange={() => flip('digest')} />} /></section><section className="settings-section"><h2>Feed</h2><SettingsRow title="Autoplay media" text="Play videos while scrolling" control={<Toggle checked={prefs.autoplay} onChange={() => flip('autoplay')} />} /><SettingsRow title="Compact post cards" text="Fit more conversations on screen" control={<Toggle checked={prefs.compact} onChange={() => flip('compact')} />} /></section><button className="primary-button save-settings" onClick={() => notify('Settings saved')}>Save preferences</button></div>;
}

function SettingsRow({ title, text, control }: { title: string; text: string; control: ReactNode }) {
  return <div className="settings-row"><div><b>{title}</b><span>{text}</span></div>{control}</div>;
}

function CreatePostModal({ open, onClose, onPublish, subscribed }: { open: boolean; onClose: () => void; onPublish: (post: Post) => void; subscribed: Set<string> }) {
  const available = communities.filter(c => subscribed.has(c.id));
  const [communityId, setCommunityId] = useState(available[0]?.id || communities[0].id);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'text' | 'image' | 'link'>('text');
  const [media, setMedia] = useState('');
  const [link, setLink] = useState('');
  if (!open) return null;
  const community = communityFor(communityId);
  const canPublish = title.trim() && (type !== 'image' || media) && (type !== 'link' || link.trim());
  const chooseImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setMedia(String(reader.result));
    reader.readAsDataURL(file);
  };
  const publish = () => {
    if (!canPublish) return;
    let domain: string | undefined;
    if (type === 'link') {
      try { domain = new URL(link).hostname.replace('www.', ''); } catch { domain = link; }
    }
    onPublish({ id: `user-${Date.now()}`, communityId, author: currentUser.name, avatar: currentUser.avatar, title: title.trim(), body: body.trim() || (type === 'link' ? link.trim() : ''), image: type === 'image' ? media : undefined, imageAlt: type === 'image' ? title.trim() : undefined, domain, flair: 'Discussion', flairColor: community.color, score: 1, comments: 0, time: 'now', type, commentTree: [] });
    setTitle(''); setBody(''); setMedia(''); setLink(''); onClose();
  };
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="create-modal" onMouseDown={event => event.stopPropagation()}>
        <div className="modal-head">
          <div><span className="eyebrow"><PenLine size={14} /> Start a conversation</span><h2>Create a post</h2></div>
          <button className="icon-button" onClick={onClose}><X size={20} /></button>
        </div>
        <label className="field-label">Community</label>
        <div className="select-wrap"><CommunityAvatar community={community} size="sm" /><select value={communityId} onChange={event => setCommunityId(event.target.value)}>{available.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select><ChevronDown size={16} /></div>
        <div className="post-type-tabs">
          <button className={type === 'text' ? 'active' : ''} onClick={() => setType('text')}><FileText size={17} /> Text</button>
          <button className={type === 'image' ? 'active' : ''} onClick={() => setType('image')}><ImageIcon size={17} /> Image</button>
          <button className={type === 'link' ? 'active' : ''} onClick={() => setType('link')}><Link2 size={17} /> Link</button>
        </div>
        <label className="field-label">Title <span>{title.length}/180</span></label>
        <input className="text-input" maxLength={180} value={title} onChange={event => setTitle(event.target.value)} placeholder={`An interesting title for ${community.name}`} />
        {type === 'image' && (
          <>
            <label className="field-label">Image</label>
            <label className={`image-upload ${media ? 'has-image' : ''}`}>
              <input type="file" accept="image/*" onChange={event => chooseImage(event.target.files?.[0])} />
              {media ? <><img src={media} alt="Post preview" /><span><ImageIcon size={16} /> Choose a different image</span></> : <><ImageIcon size={24} /><b>Drop in a photo</b><small>PNG, JPG, or WebP</small></>}
            </label>
          </>
        )}
        {type === 'link' && (
          <><label className="field-label">Link</label><div className="link-input"><Link2 size={17} /><input value={link} onChange={event => setLink(event.target.value)} placeholder="https://example.com/article" /></div></>
        )}
        <label className="field-label">{type === 'text' ? 'Body' : 'Caption'} <span>Optional</span></label>
        <textarea className="body-input" value={body} onChange={event => setBody(event.target.value)} placeholder="Share context, details, or a thoughtful question…" />
        <div className="community-guidance"><ShieldCheck size={18} style={{ color: community.color }} /><span><b>Posting to {community.name}</b><small>{community.rules[0]} · {community.rules[1]}</small></span></div>
        <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!canPublish} onClick={publish}>Publish post <ArrowUp size={16} /></button></div>
      </div>
    </div>
  );
}

function MobileNav({ page, navigate, onCreate }: { page: Page; navigate: (page: Page) => void; onCreate: () => void }) {
  return <nav className="mobile-nav"><button className={page.type === 'home' ? 'active' : ''} onClick={() => navigate({ type: 'home' })}><Home /><span>Home</span></button><button className={page.type === 'explore' ? 'active' : ''} onClick={() => navigate({ type: 'explore' })}><Compass /><span>Discover</span></button><button className="mobile-create" onClick={onCreate}><Plus /></button><button className={page.type === 'saved' ? 'active' : ''} onClick={() => navigate({ type: 'saved' })}><Bookmark /><span>Saved</span></button><button className={page.type === 'profile' ? 'active' : ''} onClick={() => navigate({ type: 'profile' })}><User /><span>Profile</span></button></nav>;
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [page, setPage] = useState<Page>({ type: 'home' });
  const [sort, setSort] = useState<SortOption>('Best');
  const [allPosts, setAllPosts] = useState<Post[]>(seedPosts);
  const [votes, setVotes] = useState<Record<string, VoteState>>(() => readStored('fora-votes', {}));
  const [saved, setSaved] = useState<Set<string>>(() => new Set(readStored<string[]>('fora-saved', ['p10'])));
  const [subscribed, setSubscribed] = useState<Set<string>>(() => new Set(readStored<string[]>('fora-subscribed', communities.filter(c => c.subscribed).map(c => c.id))));
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => (localStorage.getItem('fora-theme') as 'light' | 'dark') || 'light');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadLock = useRef(false);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const navigate = (next: Page) => { setPage(next); setSidebarOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const setTheme = (next: 'light' | 'dark') => { setThemeState(next); localStorage.setItem('fora-theme', next); };

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { localStorage.setItem('fora-votes', JSON.stringify(votes)); }, [votes]);
  useEffect(() => { localStorage.setItem('fora-saved', JSON.stringify(Array.from(saved))); }, [saved]);
  useEffect(() => { localStorage.setItem('fora-subscribed', JSON.stringify(Array.from(subscribed))); }, [subscribed]);
  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 700); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); (document.querySelector('.searchbar input') as HTMLInputElement)?.focus();
      }
    };
    document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (page.type !== 'community' || allPosts.some(post => post.communityId === page.id)) return;
    let active = true;
    generateCommunityPosts(page.id).then(generated => {
      if (active) setAllPosts(current => [...generated.filter(post => !current.some(existing => existing.id === post.id)), ...current]);
    });
    return () => { active = false; };
  }, [page, allPosts]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || page.type !== 'home') return;
    const observer = new IntersectionObserver(async entries => {
      if (!entries[0].isIntersecting || loadLock.current || loading) return;
      loadLock.current = true; setLoadingMore(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 650));
        const generated = await generateFeedBatch(Array.from(subscribed), allPosts, sort, 5);
        setAllPosts(current => [...current, ...generated.filter(post => !current.some(existing => existing.id === post.id))]);
      } finally { setLoadingMore(false); loadLock.current = false; }
    }, { rootMargin: '500px 0px' });
    observer.observe(node); return () => observer.disconnect();
  }, [page.type, sort, subscribed, allPosts.length, loading]);

  const toggleSubscribe = (id: string) => setSubscribed(current => { const next = new Set(current); const joining = !next.has(id); joining ? next.add(id) : next.delete(id); notify(joining ? `Joined ${communityFor(id).name}` : `Left ${communityFor(id).name}`); return next; });
  const toggleSaved = (id: string) => setSaved(current => { const next = new Set(current); const saving = !next.has(id); saving ? next.add(id) : next.delete(id); notify(saving ? 'Saved for later' : 'Removed from saved'); return next; });
  const setVote = (id: string, value: VoteState) => setVotes(current => ({ ...current, [id]: value }));
  const findPost = (id: string) => allPosts.find(post => post.id === id);

  const updateCommentTree = (comments: Comment[], parentId: string, reply: Comment): Comment[] => comments.map(comment => comment.id === parentId ? { ...comment, replies: [...(comment.replies || []), reply] } : { ...comment, replies: comment.replies ? updateCommentTree(comment.replies, parentId, reply) : [] });
  const replyTo = (postId: string, parentId: string, text: string) => setAllPosts(current => current.map(post => post.id === postId ? { ...post, comments: post.comments + 1, commentTree: updateCommentTree(post.commentTree || [], parentId, { id: `reply-${Date.now()}`, author: currentUser.name, avatar: currentUser.avatar, body: text, score: 1, time: 'now', replies: [] }) } : post));
  const addComment = (postId: string, text: string) => setAllPosts(current => current.map(post => post.id === postId ? { ...post, comments: post.comments + 1, commentTree: [{ id: `comment-${Date.now()}`, author: currentUser.name, avatar: currentUser.avatar, body: text, score: 1, time: 'now', replies: [] }, ...(post.commentTree || [])] } : post));

  const commonFeedProps = { allPosts, sort, setSort, navigate, votes, setVote, saved, toggleSaved, notify, subscribed, toggleSubscribe, loading, loadingMore, sentinelRef };
  let content: ReactNode;
  if (page.type === 'home') content = <HomePage {...commonFeedProps} />;
  else if (page.type === 'explore') content = <ExplorePage navigate={navigate} subscribed={subscribed} toggleSubscribe={toggleSubscribe} />;
  else if (page.type === 'community') content = <CommunityPage community={communityFor(page.id)} {...commonFeedProps} />;
  else if (page.type === 'post') {
    const post = findPost(page.id);
    content = post ? <PostDetail post={post} navigate={navigate} vote={votes[post.id] || null} onVote={value => setVote(post.id, value)} saved={saved.has(post.id)} onSave={() => toggleSaved(post.id)} notify={notify} onComment={text => addComment(post.id, text)} onReply={(parentId, text) => { replyTo(post.id, parentId, text); notify('Reply posted'); }} subscribed={subscribed} toggleSubscribe={toggleSubscribe} /> : <EmptyState icon={<FileText />} title="Post not found" text="This conversation may have been removed." action="Back home" onAction={() => navigate({ type: 'home' })} />;
  } else if (page.type === 'saved') content = <SavedPage {...commonFeedProps} />;
  else if (page.type === 'search') content = <SearchPage query={page.query} posts={allPosts} navigate={navigate} subscribed={subscribed} toggleSubscribe={toggleSubscribe} votes={votes} setVote={setVote} saved={saved} toggleSaved={toggleSaved} notify={notify} />;
  else if (page.type === 'profile') content = <ProfilePage navigate={navigate} posts={allPosts} />;
  else content = <SettingsPage theme={theme} setTheme={setTheme} notify={notify} />;

  return (
    <div className="app-shell">
      <Header page={page} navigate={navigate} onCreate={() => setCreateOpen(true)} theme={theme} setTheme={setTheme} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} notify={notify} />
      <Sidebar page={page} navigate={navigate} subscribed={subscribed} open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="content-shell">{content}</div>
      <MobileNav page={page} navigate={navigate} onCreate={() => setCreateOpen(true)} />
      <CreatePostModal open={createOpen} onClose={() => setCreateOpen(false)} subscribed={subscribed} onPublish={post => { setAllPosts(current => [post, ...current]); navigate({ type: 'post', id: post.id }); notify('Your post is live'); }} />
      <div className={`toast ${toast ? 'show' : ''}`}><Check size={16} /> {toast}</div>
    </div>
  );
}

export default App;

import { useNavigate } from 'react-router-dom';
import { useMatches } from '../hooks/useMatches';
import { useAuth } from '../contexts/AuthContext';
import { getDisplayName } from '../lib/displayName';
import { firstPhotoUrl } from '../lib/cardId';

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { matches, loading, error, activateMatch, activeMatchId } = useMatches();

  const handleConversationClick = async (match) => {
    if (activeMatchId && activeMatchId !== match.id && match.status !== 'active') {
      const confirmed = window.confirm(
        'You can only chat with one person at a time. Starting this conversation will pause your current one. Continue?'
      );
      if (!confirmed) return;
    }

    if (match.status !== 'active') {
      await activateMatch(match.id);
    }

    navigate(`/chat/${match.id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const conversations = matches.filter(m => m.status !== 'ended');
  const pastConversations = matches.filter(m => m.status === 'ended');
  const totalUnread = matches.reduce((sum, m) => sum + (m.unreadCount || 0), 0);

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
        {totalUnread > 0 && (
          <span className="px-2.5 py-0.5 bg-primary-500 text-white text-xs font-bold rounded-full">
            {totalUnread} unread
          </span>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No messages yet</h2>
          <p className="text-gray-500 mb-4">Match with someone or comment on a profile to start chatting!</p>
          <button onClick={() => navigate('/discover')} className="btn-primary">
            Start Discovering
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {conversations.length > 0 && (
            <section>
              <div className="space-y-1">
                {conversations.map(match => (
                  <ConversationRow
                    key={match.id}
                    match={match}
                    currentUserId={user?.id}
                    onClick={() => handleConversationClick(match)}
                    isActive={match.status === 'active'}
                  />
                ))}
              </div>
            </section>
          )}

          {pastConversations.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                Past Conversations
              </h2>
              <div className="space-y-1 opacity-50">
                {pastConversations.map(match => (
                  <ConversationRow
                    key={match.id}
                    match={match}
                    currentUserId={user?.id}
                    onClick={() => handleConversationClick(match)}
                    isEnded
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ConversationRow({ match, currentUserId, onClick, isActive, isEnded }) {
  const { otherUser, lastMessage, unreadCount } = match;

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isOwnMessage = lastMessage?.sender_id === currentUserId;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-2xl transition-colors text-left hover:bg-gray-50 active:bg-gray-100"
    >
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200">
          <img
            src={firstPhotoUrl(otherUser?.photos, 'https://via.placeholder.com/56?text=?')}
            alt={getDisplayName(otherUser)}
            className="w-full h-full object-cover"
          />
        </div>
        {isActive && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className={`font-semibold truncate ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
            {getDisplayName(otherUser)}
          </h3>
          {lastMessage && (
            <span className={`text-xs flex-shrink-0 ml-2 ${unreadCount > 0 ? 'text-primary-500 font-semibold' : 'text-gray-400'}`}>
              {formatTime(lastMessage.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className={`text-sm truncate flex-1 ${unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
            {lastMessage
              ? `${isOwnMessage ? 'You: ' : ''}${lastMessage.content}`
              : isEnded
              ? 'Conversation ended'
              : 'Say hello!'}
          </p>
          {unreadCount > 0 && (
            <span className="flex-shrink-0 w-5 h-5 bg-primary-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

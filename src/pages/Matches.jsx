import { useNavigate } from 'react-router-dom';
import { useMatches } from '../hooks/useMatches';
import { useAuth } from '../contexts/AuthContext';

export default function Matches() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { matches, loading, error, activateMatch, activeMatchId } = useMatches();

  const handleMatchClick = async (match) => {
    // If this match is not active and user has another active match, show warning
    if (activeMatchId && activeMatchId !== match.id && match.status !== 'active') {
      const confirmed = window.confirm(
        'You can only chat with one person at a time. Starting this conversation will pause your current one. Continue?'
      );
      if (!confirmed) return;
    }

    // Activate this match if not already active
    if (match.status !== 'active') {
      await activateMatch(match.id);
    }

    navigate(`/chat/${match.id}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // Error state
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

  // Filter matches by status
  const activeMatches = matches.filter(m => m.status === 'active');
  const pendingMatches = matches.filter(m => m.status === 'pending');
  const endedMatches = matches.filter(m => m.status === 'ended');

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Matches</h1>

      {matches.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-primary-200 mb-4">
            <svg className="w-20 h-20 mx-auto" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2">No matches yet</h2>
          <p className="text-gray-500 mb-4">Keep swiping to find your match!</p>
          <button
            onClick={() => navigate('/discover')}
            className="btn-primary"
          >
            Start Discovering
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Conversation */}
          {activeMatches.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Active Conversation
              </h2>
              <div className="space-y-2">
                {activeMatches.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onClick={() => handleMatchClick(match)}
                    isActive
                  />
                ))}
              </div>
            </section>
          )}

          {/* Pending Matches */}
          {pendingMatches.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                New Matches ({pendingMatches.length})
              </h2>
              <div className="space-y-2">
                {pendingMatches.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onClick={() => handleMatchClick(match)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Ended Conversations */}
          {endedMatches.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Past Conversations
              </h2>
              <div className="space-y-2 opacity-60">
                {endedMatches.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onClick={() => handleMatchClick(match)}
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

/**
 * Individual match card component
 */
function MatchCard({ match, onClick, isActive, isEnded }) {
  const { otherUser, lastMessage, unreadCount } = match;

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
        isActive
          ? 'bg-primary-50 border-2 border-primary-200'
          : 'bg-white hover:bg-gray-50 border border-gray-100'
      }`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200">
          <img
            src={otherUser?.photos?.[0] || 'https://via.placeholder.com/56?text=?'}
            alt={otherUser?.name || 'User'}
            className="w-full h-full object-cover"
          />
        </div>
        {isActive && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 truncate">
            {otherUser?.name || 'Unknown'}
          </h3>
          {lastMessage && (
            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
              {formatTime(lastMessage.created_at)}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate">
          {lastMessage
            ? lastMessage.content
            : isEnded
            ? 'Conversation ended'
            : 'Start a conversation!'}
        </p>
      </div>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <div className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </div>
      )}
    </button>
  );
}

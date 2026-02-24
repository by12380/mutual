import { useState } from 'react';

const formatCommentDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/**
 * Inline comment thread shown beneath a profile card section.
 *
 * @param {Array}    comments       - Array of comment objects
 * @param {Function} onAdd          - (body: string) => Promise
 * @param {Function} onDelete       - (commentId: string) => Promise
 * @param {string}   currentUserId  - Logged-in user id
 * @param {string}   profileOwnerId - Profile owner id (can delete any comment on their profile)
 */
export default function CardCommentThread({
  comments = [],
  onAdd,
  onDelete,
  currentUserId,
  profileOwnerId,
}) {
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim() || submitting) return;

    setSubmitting(true);
    const result = await onAdd(body);
    setSubmitting(false);

    if (!result?.error) {
      setBody('');
      setExpanded(true);
    }
  };

  const canDelete = (comment) =>
    currentUserId === comment.commenter_id || currentUserId === profileOwnerId;

  const visibleComments = expanded ? comments : comments.slice(-2);
  const hiddenCount = comments.length - visibleComments.length;

  if (comments.length === 0 && !onAdd) return null;

  return (
    <div className="border-t border-gray-100 px-4 pt-3 pb-3">
      {comments.length > 0 && (
        <div className="space-y-2 mb-3">
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              View {hiddenCount} more comment{hiddenCount > 1 ? 's' : ''}
            </button>
          )}

          {visibleComments.map((c) => (
            <div key={c.id} className="flex gap-2 group">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 mt-0.5">
                {c.commenter?.photos?.[0] ? (
                  <img
                    src={c.commenter.photos[0]}
                    alt={c.commenter?.name || ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] font-bold">
                    {(c.commenter?.name || '?')[0]}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs leading-snug">
                  <span className="font-semibold text-gray-900 mr-1">
                    {c.commenter?.name || 'User'}
                  </span>
                  <span className="text-gray-700">{c.body}</span>
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400">
                    {formatCommentDate(c.created_at)}
                  </span>
                  {canDelete(c) && (
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      className="text-[10px] text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {onAdd && (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment..."
            maxLength={500}
            className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={!body.trim() || submitting}
            className="text-xs font-semibold text-primary-500 disabled:text-gray-300 px-1"
          >
            Post
          </button>
        </form>
      )}
    </div>
  );
}

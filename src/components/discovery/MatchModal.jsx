import { useNavigate } from 'react-router-dom';

/**
 * Modal that appears when two users match
 * Shows both profile photos and options to start chatting or keep swiping
 */
export default function MatchModal({ profile, onClose, matchId }) {
  const navigate = useNavigate();

  const handleStartChat = () => {
    onClose();
    if (matchId) {
      navigate(`/chat/${matchId}`);
    } else {
      navigate('/matches');
    }
  };

  const handleKeepSwiping = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full text-center animate-bounce-in">
        {/* Confetti-like decoration */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="text-4xl">🎉</span>
        </div>

        <h2 className="text-2xl font-bold text-primary-500 mt-4 mb-2">
          It's a Match!
        </h2>
        <p className="text-gray-600 mb-6">
          You and {profile.name} liked each other
        </p>

        {/* Profile Photo */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary-200 shadow-lg">
            <img
              src={profile.photos?.[0] || 'https://via.placeholder.com/100?text=?'}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleStartChat}
            className="btn-primary w-full py-3"
          >
            Send a Message
          </button>
          <button
            onClick={handleKeepSwiping}
            className="btn-secondary w-full py-3"
          >
            Keep Swiping
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

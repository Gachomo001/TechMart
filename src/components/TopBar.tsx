import { useState, useRef, useEffect } from 'react';
import { Phone, Truck, User as UserIcon, Settings, LayoutDashboard, LogOut, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FeedbackModal } from './FeedbackModal';
import TrackOrderModal from './TrackOrderModal';
export const TopBar = () => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showTrackOrderModal, setShowTrackOrderModal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { user, signOut, profile } = useAuth();
  const isAdminUser = profile?.role === 'admin' || profile?.role === 'super_admin';
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowProfileMenu(false);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const handleTrackOrder = () => {
    setShowTrackOrderModal(true);
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    setShowTrackOrderModal(false);

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);
  return (
    <>
      <div className="bg-blue-600 text-white py-2 px-4 text-sm">
        <div className="container mx-auto flex justify-between items-center">
          {/* Contact info - left side */}
          <div className="flex items-center space-x-2 text-xs sm:text-sm">
            <div className="flex items-center">
              <Phone size={18} className="mr-3" />
              <span>{import.meta.env.VITE_CONTACT_PHONE || '0796 714113'}</span>
            </div>
            {/* <span className="text-blue-200"></span>
            <div className="flex items-center">
              <Mail size={18} className="mr-3" />
              <span>{import.meta.env.VITE_CONTACT_EMAIL || 'info@raiyaa.com'}</span>
            </div> */}
          </div>

          {/* Icons - on right */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowFeedbackModal(true)}
              className="hover:bg-blue-700 p-1 rounded flex items-center"
              aria-label="Share Feedback"
            >
              <MessageSquare size={16} />
              <span className="sr-only sm:not-sr-only sm:ml-1 sm:inline">Feedback</span>
            </button>

            {/* Only show Track Order button when user is logged in */}
            {user && (
              <button 
                onClick={handleTrackOrder}
                className="hover:bg-blue-700 p-1 rounded flex items-center"
                aria-label="Track Your Order"
              >
                <Truck size={16} />
                <span className="sr-only sm:not-sr-only sm:ml-1 sm:inline">Track Order</span>
              </button>
            )}

            <div className="relative" ref={profileMenuRef}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="hover:bg-blue-700 p-1 rounded flex items-center"
                aria-label="My Account"
              >
                <UserIcon size={16} />
                <span className="sr-only sm:not-sr-only sm:ml-1">Account</span>
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  {user ? (
                    <>
                      <Link
                        to="/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        <span>Edit Profile</span>
                      </Link>
                      {isAdminUser && (
                        <Link
                          to="/admin"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          <span>Admin Panel</span>
                        </Link>
                      )}
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        <span>Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/auth"
                      onClick={() => setShowProfileMenu(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <div className="text-xs text-gray-500">Hello,</div>
                      <div className="font-medium">Sign in / Register</div>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Track Order Modal */}
      <TrackOrderModal 
        isOpen={showTrackOrderModal} 
        onClose={() => setShowTrackOrderModal(false)} 
      />

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
      />
    </>
  );
};

export default TopBar;

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Get the original page URL from localStorage
        const returnUrl = localStorage.getItem('authReturnUrl') || '/';
        
        // Clear the stored return URL
        localStorage.removeItem('authReturnUrl');
        
        // Redirect to the original page
        navigate(returnUrl, { replace: true });
      } else {
        // If no user, redirect to auth page
        navigate('/auth', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  // Show loading spinner while processing
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
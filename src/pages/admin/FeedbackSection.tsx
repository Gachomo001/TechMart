import React, { useState, useEffect } from 'react';
import { MessageSquare, Star, Clock, CheckCircle, AlertCircle, Eye, RotateCcw } from 'lucide-react';

interface Feedback {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  rating: number;
  status: 'new' | 'in_progress' | 'resolved';
  created_at: string;
  updated_at?: string;
}

interface FeedbackStats {
  total: number;
  new: number;
  in_progress: number;
  resolved: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

interface FeedbackResponse {
  success: boolean;
  data: Feedback[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const FeedbackSection: React.FC = () => {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '5'
      });

      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }

      const response = await fetch(`/api/feedback/admin?${params}`);
      const result: FeedbackResponse = await response.json();

      if (result.success) {
        setFeedback(result.data);
      } else {
        setError('Failed to fetch feedback');
      }
    } catch (err) {
      setError('Error fetching feedback');
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/feedback/stats');
      const result = await response.json();

      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Error fetching feedback stats:', err);
    }
  };

  const updateFeedbackStatus = async (id: string, newStatus: 'new' | 'in_progress' | 'resolved') => {
    try {
      const response = await fetch(`/api/feedback/admin/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh feedback list and stats
        fetchFeedback();
        fetchStats();
      } else {
        setError('Failed to update feedback status');
      }
    } catch (err) {
      setError('Error updating feedback status');
      console.error('Error updating feedback status:', err);
    }
  };

  useEffect(() => {
    fetchFeedback();
    fetchStats();
  }, [currentPage, selectedStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400';
      case 'resolved':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-600'
        }`}
      />
    ));
  };

  if (loading && feedback.length === 0) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-700/50">
          <h3 className="text-base sm:text-lg font-medium text-white flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Customer Feedback
          </h3>
        </div>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-slate-400 mt-2">Loading feedback...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h3 className="text-base sm:text-lg font-medium text-white flex items-center">
            <MessageSquare className="h-5 w-5 mr-2" />
            Customer Feedback
          </h3>
          
          {/* Stats Summary */}
          {stats && (
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center text-yellow-400">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>{stats.new} New</span>
              </div>
              <div className="flex items-center text-blue-400">
                <Clock className="h-4 w-4 mr-1" />
                <span>{stats.in_progress} In Progress</span>
              </div>
              <div className="flex items-center text-green-400">
                <CheckCircle className="h-4 w-4 mr-1" />
                <span>{stats.resolved} Resolved</span>
              </div>
              <div className="flex items-center text-white">
                <Star className="h-4 w-4 mr-1 text-yellow-400 fill-current" />
                <span>{stats.averageRating}/5 Avg</span>
              </div>
            </div>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {['all', 'new', 'in_progress', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setSelectedStatus(status);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                selectedStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {feedback.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No feedback found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedback.map((item) => (
              <div
                key={item.id}
                className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-white truncate">
                        {item.subject}
                      </h4>
                      <div className="flex items-center">
                        {renderStars(item.rating)}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      By {item.name} ({item.email}) • {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => setExpandedFeedback(expandedFeedback === item.id ? null : item.id)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedFeedback === item.id && (
                  <div className="mt-3 pt-3 border-t border-slate-600/30">
                    <p className="text-sm text-slate-300 mb-4 whitespace-pre-wrap">
                      {item.message}
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {item.status !== 'in_progress' && (
                        <button
                          onClick={() => updateFeedbackStatus(item.id, 'in_progress')}
                          className="px-3 py-1 text-xs font-medium text-blue-400 bg-blue-500/20 hover:bg-blue-500/30 rounded-md transition-colors flex items-center"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Mark In Progress
                        </button>
                      )}
                      {item.status !== 'resolved' && (
                        <button
                          onClick={() => updateFeedbackStatus(item.id, 'resolved')}
                          className="px-3 py-1 text-xs font-medium text-green-400 bg-green-500/20 hover:bg-green-500/30 rounded-md transition-colors flex items-center"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Resolved
                        </button>
                      )}
                      {item.status !== 'new' && (
                        <button
                          onClick={() => updateFeedbackStatus(item.id, 'new')}
                          className="px-3 py-1 text-xs font-medium text-yellow-400 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-md transition-colors flex items-center"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Mark as New
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackSection;
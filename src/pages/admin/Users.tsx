import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, Edit, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'customer' | 'admin' | 'super_admin';
  created_at: string;
  updated_at: string;
  phone: string | null;
  status: 'active' | 'inactive';
  avatar_url?: string;
  full_name?: string;
}

interface UserStats {
  orderCount: number;
  totalSpent: number;
}

interface EditFormData {
  full_name: string;
  role: 'customer' | 'admin' | 'super_admin';
}

const Users: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    full_name: '',
    role: 'customer'
  });
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      if (!profilesData) {
        console.log('No profiles found');
        setProfiles([]);
        return;
      }

      console.log('Fetched profiles:', profilesData);
      setProfiles(profilesData);

      // Fetch order statistics for each user
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, total_amount');

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      // Calculate statistics
      const stats: Record<string, UserStats> = {};
      ordersData?.forEach(order => {
        if (!stats[order.user_id]) {
          stats[order.user_id] = { orderCount: 0, totalSpent: 0 };
        }
        stats[order.user_id].orderCount++;
        stats[order.user_id].totalSpent += Number(order.total_amount);
      });

      setUserStats(stats);
    } catch (error) {
      console.error('Error in fetchProfiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleViewProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setShowViewModal(true);
  };

  const handleEditProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setEditFormData({
      full_name: profile.full_name || '',
      role: profile.role
    });
    setEditModalOpen(true);
  };

  const handleUpdateProfile = async (profileId: string, updates: { role?: Profile['role']; status?: Profile['status'] }) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId);

      if (error) throw error;

      // Update local state
      setProfiles(profiles.map(p => 
        p.id === profileId ? { ...p, ...updates } : p
      ));

      setEditModalOpen(false);
      setSelectedProfile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProfile) {
      try {
        await handleUpdateProfile(selectedProfile.id, {
          role: editFormData.role,
          status: selectedProfile.status
        });
        setEditModalOpen(false);
      } catch (error) {
        console.error('Failed to update profile:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Users</h1>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-700/30">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Join Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Orders
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Total Spent
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {profile.avatar_url ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={profile.avatar_url}
                            alt={profile.full_name || profile.email}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center">
                            <span className="text-slate-300 text-sm font-medium">
                              {(profile.full_name || profile.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">
                          {profile.full_name || 'No Name'}
                        </div>
                        <div className="text-sm text-slate-400">
                            {profile.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${profile.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                        profile.role === 'super_admin' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'}`}>
                        {profile.role}
                      </span>
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {formatDate(profile.created_at)}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {userStats[profile.id]?.orderCount || 0}
                    </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {formatCurrency(userStats[profile.id]?.totalSpent || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500/20 text-green-400">
                        Active
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewProfile(profile)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleEditProfile(profile)}
                          className="text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && selectedProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-700/50">
            <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white">User Profile</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-slate-400 hover:text-slate-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Name</label>
                  <p className="mt-1 text-sm text-white">{selectedProfile.full_name || 'No Name'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Email</label>
                  <p className="mt-1 text-sm text-white">{selectedProfile.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Role</label>
                  <p className="mt-1 text-sm text-white capitalize">{selectedProfile.role}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Join Date</label>
                  <p className="mt-1 text-sm text-white">{formatDate(selectedProfile.created_at)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Last Updated</label>
                  <p className="mt-1 text-sm text-white">{formatDate(selectedProfile.updated_at)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Order Statistics</label>
                  <div className="mt-1 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-400">Total Orders</p>
                      <p className="text-sm font-medium text-white">
                        {userStats[selectedProfile.id]?.orderCount || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400">Total Spent</p>
                      <p className="text-sm font-medium text-white">
                        {formatCurrency(userStats[selectedProfile.id]?.totalSpent || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-slate-700/50">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-slate-700/50 text-white rounded-md text-sm font-medium hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && selectedProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-700/50">
            <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white">Edit User</h2>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Role
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ 
                      ...editFormData, 
                      role: e.target.value as 'customer' | 'admin' | 'super_admin' 
                    })}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-600 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users; 
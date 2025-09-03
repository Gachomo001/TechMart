import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ExternalLink, Save, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface FooterLink {
  id: string;
  section_name: string;
  title: string;
  url: string;
  order_index: number;
  is_active: boolean;
  opens_in_new_tab: boolean;
  created_at: string;
  updated_at: string;
}

interface LinkFormData {
  section_name: string;
  title: string;
  url: string;
  order_index: number;
  opens_in_new_tab: boolean;
}

const FooterLinks: React.FC = () => {
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLink, setEditingLink] = useState<FooterLink | null>(null);
  const [formData, setFormData] = useState<LinkFormData>({
    section_name: '',
    title: '',
    url: '',
    order_index: 0,
    opens_in_new_tab: false
  });
  const { user, isAdmin, access_token } = useAuth();

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    if (user && isAdmin) {
      fetchLinks();
      fetchSections();
    } else if (!loading) {
      setError('Admin access required');
    }
  }, [user, isAdmin]);

  const fetchLinks = async () => {
    if (!access_token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/footer-links/admin`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        throw new Error('Failed to fetch footer links');
      }

      const data = await response.json();
      setLinks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch links');
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    if (!access_token) return;

    try {
      const response = await fetch(`${API_BASE}/footer-links/sections`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSections(data);
      }
    } catch (err) {
      console.error('Failed to fetch sections:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!access_token) {
      setError('Authentication required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const url = editingLink 
        ? `${API_BASE}/footer-links/${editingLink.id}`
        : `${API_BASE}/footer-links`;
      
      const method = editingLink ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save link');
      }

      await fetchLinks();
      await fetchSections();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save link');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;
    if (!access_token) {
      setError('Authentication required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/footer-links/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${access_token}`,
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        throw new Error('Failed to delete link');
      }

      await fetchLinks();
      await fetchSections();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete link');
    }
  };

  const updateOrder = async (link: FooterLink, newOrder: number) => {
    if (!access_token) {
      setError('Authentication required');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/footer-links/${link.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ order_index: newOrder })
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        throw new Error('Failed to update link order');
      }

      await fetchLinks();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    }
  };

  const resetForm = () => {
    setFormData({
      section_name: '',
      title: '',
      url: '',
      order_index: 0,
      opens_in_new_tab: false
    });
    setShowAddForm(false);
    setEditingLink(null);
  };

  const startEdit = (link: FooterLink) => {
    setFormData({
      section_name: link.section_name,
      title: link.title,
      url: link.url,
      order_index: link.order_index,
      opens_in_new_tab: link.opens_in_new_tab
    });
    setEditingLink(link);
    setShowAddForm(true);
  };

  // Group links by section
  const groupedLinks = links.reduce((acc, link) => {
    if (!acc[link.section_name]) {
      acc[link.section_name] = [];
    }
    acc[link.section_name].push(link);
    return acc;
  }, {} as Record<string, FooterLink[]>);

  // Sort links within each section by order_index
  Object.keys(groupedLinks).forEach(section => {
    groupedLinks[section].sort((a, b) => a.order_index - b.order_index);
  });

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error if not admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-300 mb-2">Access Denied</h3>
          <p className="text-slate-400">Admin access required to manage footer links</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Footer Links Management</h2>
          <p className="text-slate-300">Manage the links displayed in your website footer</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={submitting}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Link
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              {editingLink ? 'Edit Link' : 'Add New Link'}
            </h3>
            <button
              onClick={resetForm}
              disabled={submitting}
              className="text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Section Name
                </label>
                <input
                  type="text"
                  value={formData.section_name}
                  onChange={(e) => setFormData({ ...formData, section_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="e.g., Quick Links"
                  list="sections"
                  disabled={submitting}
                  required
                />
                <datalist id="sections">
                  {sections.map(section => (
                    <option key={section} value={section} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Link Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="e.g., About Us"
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="e.g., /about or https://example.com"
                  disabled={submitting}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Order
                </label>
                <input
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  min="0"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="opens_in_new_tab"
                checked={formData.opens_in_new_tab}
                onChange={(e) => setFormData({ ...formData, opens_in_new_tab: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 disabled:opacity-50"
                disabled={submitting}
              />
              <label htmlFor="opens_in_new_tab" className="ml-2 text-sm text-slate-300">
                Open in new tab
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {submitting ? 'Saving...' : (editingLink ? 'Update Link' : 'Add Link')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="inline-flex items-center px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Links by Section */}
      <div className="space-y-6">
        {Object.keys(groupedLinks).length === 0 ? (
          <div className="text-center py-12">
            <ExternalLink className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No footer links yet</h3>
            <p className="text-slate-400 mb-4">Add your first footer link to get started</p>
            <button
              onClick={() => setShowAddForm(true)}
              disabled={submitting}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </button>
          </div>
        ) : (
          Object.keys(groupedLinks).map(sectionName => (
            <div key={sectionName} className="bg-slate-800 rounded-lg border border-slate-700">
              <div className="px-6 py-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">{sectionName}</h3>
                <p className="text-sm text-slate-400">{groupedLinks[sectionName].length} links</p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {groupedLinks[sectionName].map((link, index) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-slate-400">#{link.order_index}</span>
                          <h4 className="font-medium text-white truncate">{link.title}</h4>
                          {link.opens_in_new_tab && (
                            <ExternalLink className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <p className="text-sm text-slate-400 truncate mt-1">{link.url}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => updateOrder(link, Math.max(0, link.order_index - 1))}
                          disabled={index === 0 || submitting}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateOrder(link, link.order_index + 1)}
                          disabled={index === groupedLinks[sectionName].length - 1 || submitting}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => startEdit(link)}
                          disabled={submitting}
                          className="p-2 text-slate-400 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(link.id)}
                          disabled={submitting}
                          className="p-2 text-slate-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FooterLinks;

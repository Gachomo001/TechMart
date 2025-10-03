import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ExternalLink, Save, X, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import DeleteConfirmationModal from '../DeleteConfirmationModal';

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<FooterLink | null>(null);
  const [formData, setFormData] = useState<LinkFormData>({
    section_name: '',
    title: '',
    url: '',
    order_index: 0,
    opens_in_new_tab: false
  });
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (user && isAdmin) {
      fetchLinks();
      fetchSections();
    } else if (!loading) {
      setError('Admin access required');
    }
  }, [user, isAdmin]);

  const fetchLinks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('footer_links')
        .select('*')
        .order('section_name', { ascending: true })
        .order('order_index', { ascending: true });

      if (fetchError) {
        console.error('Error fetching footer links:', fetchError);
        setError('Failed to fetch footer links');
        return;
      }

      setLinks(data || []);
    } catch (err) {
      console.error('Error in footer links fetch:', err);
      setError('Error fetching footer links');
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('footer_links')
        .select('section_name')
        .order('section_name', { ascending: true });

      if (error) {
        console.error('Error fetching sections:', error);
        return;
      }

      const uniqueSections = [...new Set(data?.map(item => item.section_name) || [])];
      setSections(uniqueSections);
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingLink) {
        const { error } = await supabase
          .from('footer_links')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLink.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('footer_links')
          .insert([{
            ...formData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (error) throw error;
      }

      await fetchLinks();
      await fetchSections();
      resetForm();
    } catch (err) {
      console.error('Error saving link:', err);
      setError('Failed to save link');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (link: FooterLink) => {
    setLinkToDelete(link);
    setDeleteModalOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!linkToDelete) return;
  
    try {
      setSubmitting(true);
      const { error } = await supabase
        .from('footer_links')
        .delete()
        .eq('id', linkToDelete.id);
  
      if (error) throw error;
      await fetchLinks();
      await fetchSections();
    } catch (err) {
      console.error('Error deleting link:', err);
      setError('Failed to delete link');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSocialMediaUpdate = (platform: string, value: string) => {
    setLinks(prevLinks => {
      const updatedLinks = [...prevLinks];
      const existingIndex = updatedLinks.findIndex(link => 
        link.section_name === 'Social Media' && 
        link.title.toLowerCase().includes(platform.toLowerCase().split(' ')[0])
      );
      
      if (existingIndex >= 0) {
        updatedLinks[existingIndex] = { ...updatedLinks[existingIndex], url: value };
      }
      
      return updatedLinks;
    });
  };

  const saveSocialMediaLink = async (platform: string, url: string) => {
    try {
      setSubmitting(true);
      
      const existingLink = links.find(link => 
        link.section_name === 'Social Media' && 
        link.title.toLowerCase().includes(platform.toLowerCase().split(' ')[0])
      );

      if (existingLink) {
        const { error } = await supabase
          .from('footer_links')
          .update({ url, updated_at: new Date().toISOString() })
          .eq('id', existingLink.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('footer_links')
          .insert([{
            section_name: 'Social Media',
            title: platform,
            url,
            order_index: ['Facebook', 'X (Twitter)', 'Instagram', 'WhatsApp'].indexOf(platform) + 1,
            is_active: true,
            opens_in_new_tab: true
          }]);

        if (error) throw error;
      }

      await fetchLinks();
    } catch (err) {
      console.error('Error saving social media link:', err);
      setError('Failed to save social media link');
    } finally {
      setSubmitting(false);
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
    setEditingLink(null);
    setShowAddForm(false);
  };

  const handleEdit = (link: FooterLink) => {
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

  const handleToggleActive = async (link: FooterLink) => {
    try {
      const { error } = await supabase
        .from('footer_links')
        .update({
          is_active: !link.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', link.id);
  
      if (error) throw error;
      await fetchLinks();
    } catch (err) {
      console.error('Error toggling link status:', err);
      setError('Failed to update link status');
    }
  };
  
  const handleReorder = async (link: FooterLink, direction: 'up' | 'down') => {
    const sectionLinks = links.filter(l => l.section_name === link.section_name);
    const currentIndex = sectionLinks.findIndex(l => l.id === link.id);
    
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sectionLinks.length - 1)
    ) {
      return;
    }
  
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const otherLink = sectionLinks[newIndex];
  
    try {
      // Swap order_index values
      const { error: error1 } = await supabase
        .from('footer_links')
        .update({ order_index: otherLink.order_index })
        .eq('id', link.id);
  
      const { error: error2 } = await supabase
        .from('footer_links')
        .update({ order_index: link.order_index })
        .eq('id', otherLink.id);
  
      if (error1 || error2) throw new Error('Failed to reorder links');
      await fetchLinks();
    } catch (err) {
      console.error('Error reordering links:', err);
      setError('Failed to reorder links');
    }
  };

  const groupedLinks = links
    .filter(link => link.section_name !== 'Social Media')
    .reduce((acc, link) => {
      if (!acc[link.section_name]) {
        acc[link.section_name] = [];
      }
      acc[link.section_name].push(link);
      return acc;
    }, {} as Record<string, FooterLink[]>);

  if (!user || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Admin access required to manage footer links.</p>
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

      {/* Social Media Section */}
      <div className="mb-8 bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <ExternalLink className="h-5 w-5 mr-2" />
          Social Media Links
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['Facebook', 'X (Twitter)', 'Instagram', 'WhatsApp'].map((platform) => {
            const socialLink = links.find(link => 
              link.section_name === 'Social Media' && 
              link.title.toLowerCase().includes(platform.toLowerCase().split(' ')[0])
            );
            
            return (
              <div key={platform} className="bg-slate-700/50 p-4 rounded border border-slate-600">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {platform} {platform === 'WhatsApp' ? '(Phone Number)' : '(URL)'}
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={socialLink?.url || ''}
                    onChange={(e) => handleSocialMediaUpdate(platform, e.target.value)}
                    placeholder={platform === 'WhatsApp' ? '+254712345678' : `https://${platform.toLowerCase()}.com/yourpage`}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-l-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => saveSocialMediaLink(platform, socialLink?.url || '')}
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
                  {sections.filter(s => s !== 'Social Media').map(section => (
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
          Object.entries(groupedLinks).map(([sectionName, sectionLinks]) => (
            <div key={sectionName} className="bg-slate-800 rounded-lg border border-slate-700">
              <div className="px-6 py-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white">{sectionName}</h3>
                <p className="text-sm text-slate-400">{sectionLinks.length} links</p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {sectionLinks.map((link, index) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-slate-400">#{link.order_index}</span>
                          <h4 className={`font-medium truncate ${link.is_active ? 'text-white' : 'text-slate-500'}`}>
                            {link.title}
                          </h4>
                          {link.opens_in_new_tab && (
                            <ExternalLink className="w-4 h-4 text-slate-400" />
                          )}
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            link.is_active ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                          }`}>
                            {link.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 truncate mt-1">{link.url}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleReorder(link, 'up')}
                          disabled={index === 0 || submitting}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReorder(link, 'down')}
                          disabled={index === sectionLinks.length - 1 || submitting}
                          className="p-1 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(link)}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${
                            link.is_active 
                              ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70' 
                              : 'bg-green-900/50 text-green-300 hover:bg-green-900/70'
                          }`}
                        >
                          {link.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleEdit(link)}
                          disabled={submitting}
                          className="p-2 text-slate-400 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(link)}
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
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setLinkToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        itemName={linkToDelete?.title || ''}
        itemType="footer link"
      />
    </div>
  );
};

export default FooterLinks;
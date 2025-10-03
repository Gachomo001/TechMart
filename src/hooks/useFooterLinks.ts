import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

interface GroupedFooterLinks {
  [sectionName: string]: FooterLink[];
}

export const useFooterLinks = () => {
  const [footerLinks, setFooterLinks] = useState<GroupedFooterLinks>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFooterLinks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('footer_links')
        .select('*')
        .eq('is_active', true)
        .order('section_name', { ascending: true })
        .order('order_index', { ascending: true });

      if (fetchError) {
        console.error('Error fetching footer links:', fetchError);
        setError('Failed to fetch footer links');
        return;
      }

      // Group links by section
      const grouped: GroupedFooterLinks = {};
      data?.forEach(link => {
        if (!grouped[link.section_name]) {
          grouped[link.section_name] = [];
        }
        grouped[link.section_name].push(link);
      });

      setFooterLinks(grouped);
      console.log('Footer links fetched successfully:', grouped);

    } catch (err) {
      console.error('Error in footer links fetch:', err);
      setError('Error fetching footer links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFooterLinks();
  }, []);

  return {
    footerLinks,
    loading,
    error,
    refetch: fetchFooterLinks
  };
};

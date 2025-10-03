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

interface SocialMediaLinks {
  facebook: string;
  twitter: string;
  instagram: string;
  whatsapp: string;
}

export const useFooterLinks = () => {
  const [footerLinks, setFooterLinks] = useState<GroupedFooterLinks>({});
  const [socialMediaLinks, setSocialMediaLinks] = useState<SocialMediaLinks>({
    facebook: '',
    twitter: '',
    instagram: '',
    whatsapp: ''
  });
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

      // Separate social media links from regular footer links
      const regularLinks: GroupedFooterLinks = {};
      const socialLinks: SocialMediaLinks = {
        facebook: '',
        twitter: '',
        instagram: '',
        whatsapp: ''
      };

      data?.forEach(link => {
        if (link.section_name === 'Social Media') {
          // Handle social media links
          const title = link.title.toLowerCase();
          if (title.includes('facebook')) {
            // For Facebook, if it's just a username, convert to Facebook URL
            const url = link.url;
            if (url && !url.startsWith('http')) {
              socialLinks.facebook = `https://facebook.com/${url.replace(/^@/, '')}`;
            } else {
              socialLinks.facebook = url;
            }
          } else if (title.includes('x') || title.includes('twitter')) {
            // For Twitter/X, if it's just a username, convert to X URL
            const url = link.url;
            if (url && !url.startsWith('http')) {
              socialLinks.twitter = `https://x.com/${url.replace(/^@/, '')}`;
            } else {
              socialLinks.twitter = url;
            }
          } else if (title.includes('instagram')) {
            // For Instagram, if it's just a username, convert to Instagram URL
            const url = link.url;
            if (url && !url.startsWith('http')) {
              socialLinks.instagram = `https://instagram.com/${url.replace(/^@/, '')}`;
            } else {
              socialLinks.instagram = url;
            }
          } else if (title.includes('whatsapp')) {
            // For WhatsApp, if it's just a number, convert to WhatsApp URL
            const url = link.url;
            if (url && !url.startsWith('http')) {
              // If it's just a number, create WhatsApp URL
              socialLinks.whatsapp = `https://wa.me/${url.replace(/[^\d]/g, '')}`;
            } else {
              socialLinks.whatsapp = url;
            }
          }
        } else {
          // Handle regular footer links
          if (!regularLinks[link.section_name]) {
            regularLinks[link.section_name] = [];
          }
          regularLinks[link.section_name].push(link);
        }
      });

      setFooterLinks(regularLinks);
      setSocialMediaLinks(socialLinks);
      console.log('Footer links fetched successfully:', { regularLinks, socialLinks });

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
    socialMediaLinks,
    loading,
    error,
    refetch: fetchFooterLinks
  };
};

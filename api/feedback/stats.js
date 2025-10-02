import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration for feedback stats API');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      // Get total count and status breakdown
      const { data: allFeedback, error } = await supabase
        .from('feedback')
        .select('status, rating, created_at');

      if (error) {
        console.error('Error fetching feedback stats:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch feedback statistics'
        });
      }

      const stats = {
        total: allFeedback?.length || 0,
        new: allFeedback?.filter(f => f.status === 'new').length || 0,
        in_progress: allFeedback?.filter(f => f.status === 'in_progress').length || 0,
        resolved: allFeedback?.filter(f => f.status === 'resolved').length || 0,
        averageRating: 0,
        ratingDistribution: {
          1: 0, 2: 0, 3: 0, 4: 0, 5: 0
        }
      };

      if (allFeedback && allFeedback.length > 0) {
        // Calculate average rating
        const totalRating = allFeedback.reduce((sum, f) => sum + f.rating, 0);
        stats.averageRating = Number((totalRating / allFeedback.length).toFixed(1));

        // Calculate rating distribution
        allFeedback.forEach(f => {
          stats.ratingDistribution[f.rating]++;
        });
      }

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error in feedback stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  } else {
    res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
}

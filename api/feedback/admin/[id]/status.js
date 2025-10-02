import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration for feedback status API');
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

  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const { status } = req.body;

      // Validate status
      if (!['new', 'in_progress', 'resolved'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be: new, in_progress, or resolved'
        });
      }

      const { data, error } = await supabase
        .from('feedback')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating feedback status:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update feedback status'
        });
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Feedback not found'
        });
      }

      res.json({
        success: true,
        message: 'Feedback status updated successfully',
        data
      });

    } catch (error) {
      console.error('Error in feedback status update:', error);
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

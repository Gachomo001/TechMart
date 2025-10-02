import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration for feedback routes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface FeedbackData {
  name: string;
  email: string;
  subject: string;
  message: string;
  rating: number;
}

// POST /api/feedback - Submit new feedback
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message, rating }: FeedbackData = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message || !rating) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }

    // Insert feedback into database
    const { data, error } = await supabase
      .from('feedback')
      .insert([
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          subject: subject.trim(),
          message: message.trim(),
          rating,
          status: 'new',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error inserting feedback:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit feedback'
      });
    }

    console.log('Feedback submitted successfully:', {
      id: data.id,
      name: data.name,
      email: data.email,
      subject: data.subject,
      rating: data.rating
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        id: data.id,
        created_at: data.created_at
      }
    });

  } catch (error) {
    console.error('Error in feedback submission:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// GET /api/feedback/admin - Get all feedback for admin (with pagination)
router.get('/admin', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('feedback')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status if provided
    if (status && ['new', 'in_progress', 'resolved'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching feedback:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch feedback'
      });
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Error in feedback fetch:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// PUT /api/feedback/admin/:id/status - Update feedback status
router.put('/admin/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
});

// GET /api/feedback/stats - Get feedback statistics for admin dashboard
router.get('/stats', async (req: Request, res: Response) => {
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
        stats.ratingDistribution[f.rating as keyof typeof stats.ratingDistribution]++;
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
});

export default router;
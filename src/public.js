import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Get published moments for public PWA
router.get('/moments', async (req, res) => {
  try {
    const { region, category } = req.query;
    
    let query = supabase
      .from('moments')
      .select(`
        id,
        title,
        content,
        region,
        category,
        is_sponsored,
        broadcasted_at,
        sponsors(display_name)
      `)
      .eq('status', 'broadcasted')
      .order('broadcasted_at', { ascending: false })
      .limit(50);

    if (region) query = query.eq('region', region);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ moments: data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load moments' });
  }
});

// Public stats endpoint (no auth required)
router.get('/stats', async (req, res) => {
  try {
    // Get public statistics without sensitive data
    const [momentsResult, subscribersResult, broadcastsResult] = await Promise.all([
      supabase.from('moments').select('id', { count: 'exact' }).eq('status', 'broadcasted'),
      supabase.from('subscriptions').select('id', { count: 'exact' }).eq('opted_in', true),
      supabase.from('broadcasts').select('id', { count: 'exact' }).eq('status', 'completed')
    ]);

    const stats = {
      totalMoments: momentsResult.count || 0,
      activeSubscribers: subscribersResult.count || 0,
      totalBroadcasts: broadcastsResult.count || 0,
      lastUpdated: new Date().toISOString()
    };

    res.json(stats);
  } catch (error) {
    console.error('Public stats error:', error);
    // Return default stats on error
    res.json({
      totalMoments: 0,
      activeSubscribers: 0,
      totalBroadcasts: 0,
      lastUpdated: new Date().toISOString()
    });
  }
});

export default router;
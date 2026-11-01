require('dotenv').config();
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Initialize Supabase Admin Client (using service role key for backend operations)
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
    console.log('[Sync Worker] Running scheduled review aggregation sync...');
    
    try {
        // 1. Fetch businesses that have external pages linked
        // (Assuming you store external access tokens or profile IDs in your business table)
        const { data: businesses, error: bizError } = await supabase
            .from('businesses')
            .select('business_id, name, last_sync');

        if (bizError) throw bizError;

        for (const biz of businesses) {
            await syncGoogleReviews(biz);
            await syncFacebookReviews(biz);

            // Update Business last_sync timestamp (Algorithm 1)
            await supabase
                .from('businesses')
                .update({ last_sync: new Date().toISOString() })
                .eq('business_id', biz.business_id);
        }

        console.log('[Sync Worker] Review synchronization completed successfully.');
    } catch (err) {
        console.error('[Sync Worker Error]:', err.message);
    }
});

async function syncGoogleReviews(business) {
    try {
        // Placeholder for Google Business Profile API call
        // const response = await axios.get(`https://mybusiness.googleapis.com/v4/...`, { headers: { ... } });
        // const externalReviews = response.data.reviews || [];
        
        const externalReviews = []; // Mock array for illustration

        for (const rev of externalReviews) {
            // Inserting into Supabase. 
            // The UNIQUE(platform, external_id) constraint automatically prevents duplicates[cite: 1].
            await supabase.from('reviews').upsert([{
                business_id: business.business_id,
                platform: 'Google',
                external_id: rev.reviewId,
                rating: rev.starRating,
                text: rev.comment,
                created_at: rev.createTime
            }], { onConflict: 'platform,external_id' });
        }
    } catch (err) {
        console.error(`Failed to sync Google reviews for ${business.name}:`, err.message);
    }
}

async function syncFacebookReviews(business) {
    try {
        // Placeholder for Facebook Graph API call
        // const response = await axios.get(`https://graph.facebook.com/v18.0/{page-id}/ratings...`);
        const externalReviews = []; // Mock array for illustration

        for (const rev of externalReviews) {
            await supabase.from('reviews').upsert([{
                business_id: business.business_id,
                platform: 'Facebook',
                external_id: rev.id,
                rating: rev.rating,
                text: rev.review_text,
                created_at: rev.created_time
            }], { onConflict: 'platform,external_id' });
        }
    } catch (err) {
        console.error(`Failed to sync Facebook reviews for ${business.name}:`, err.message);
    }
}
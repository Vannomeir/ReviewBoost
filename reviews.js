document.addEventListener('DOMContentLoaded', async () => {
    // 1. Mobile Menu Logic
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }

    // 2. Auth Protection - Redirect to login if no active session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
        window.location.href = 'login.html';
        return;
    }

    // 3. Fetch Business & Reviews from Supabase
    let allReviews = [];

    try {
        const { data: business, error: bizError } = await supabase
            .from('businesses')
            .select('business_id')
            .eq('user_id', session.user.id)
            .single();

        if (bizError || !business) {
            console.warn("No business linked to this user.");
            return;
        }

        const { data: reviews, error: revError } = await supabase
            .from('reviews')
            .select('*')
            .eq('business_id', business.business_id)
            .order('created_at', { ascending: false });

        if (revError) throw revError;
        allReviews = reviews || [];

    } catch (error) {
        console.error("Error loading reviews:", error.message);
    }

    const listContainer = document.getElementById('reviews');
    const countLabel = document.getElementById('reviews-count');
    const filterForm = document.getElementById('filters');

    // Render the list of reviews to the DOM
    function renderReviews(reviewsToRender) {
        listContainer.innerHTML = ''; 
        countLabel.textContent = `${reviewsToRender.length} reviews found`;

        if (reviewsToRender.length === 0) {
            listContainer.innerHTML = '<li class="review-item"><p style="color: #6b7280;">No reviews match these filters.</p></li>';
            return;
        }

        reviewsToRender.forEach(r => {
            const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
            const dateFormatted = new Date(r.created_at).toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric', year: 'numeric' 
            });
            
            // Check if a reply exists, otherwise show a reply placeholder input or button
            const replyHTML = r.reply 
                ? `<div style="margin-top:15px; padding:12px; background:#f9fafb; border-left:4px solid #2563eb; font-size:0.9em; border-radius:4px;"><strong>Your reply:</strong> ${r.reply}</div>`
                : `<div style="margin-top: 15px;">
                     <input type="text" id="reply-input-${r.review_id}" placeholder="Write a reply..." style="padding: 6px; width: 70%; border: 1px solid #d1d5db; border-radius: 4px; font-size: 0.9em;">
                     <button class="btn small reply-btn" data-id="${r.review_id}" style="padding: 7px 12px; background:#2563eb; color:white; border:none; border-radius:4px; cursor:pointer; margin-left: 5px;">Post</button>
                   </div>`;

            const li = document.createElement('li');
            li.className = 'review-item';
            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <div>
                        <strong style="color: #f39c12; letter-spacing:2px; font-size: 1.1em;">${stars}</strong>
                        <span style="background: #eff6ff; color: #2563eb; padding: 3px 10px; border-radius: 12px; font-size: 0.8em; margin-left: 12px;">${r.platform}</span>
                    </div>
                    <span style="color: #9ca3af; font-size: 0.85em;">${dateFormatted}</span>
                </div>
                <p style="color:#374151; line-height: 1.5;">"${r.text || 'No comment provided'}"</p>
                ${replyHTML}
            `;
            listContainer.appendChild(li);
        });

        // Attach event listeners to newly rendered reply buttons
        document.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const reviewId = e.target.getAttribute('data-id');
                const inputField = document.getElementById(`reply-input-${reviewId}`);
                const replyText = inputField.value.trim();

                if (!replyText) {
                    alert("Please write a reply before posting.");
                    return;
                }

                try {
                    const { error } = await supabase
                        .from('reviews')
                        .update({ reply: replyText })
                        .eq('review_id', reviewId);

                    if (error) throw error;

                    // Update local state and re-render
                    const targetReview = allReviews.find(item => item.review_id === reviewId);
                    if (targetReview) targetReview.reply = replyText;
                    applyFilters();
                } catch (err) {
                    console.error("Error posting reply:", err.message);
                    alert("Failed to save reply.");
                }
            });
        });
    }

    // Apply filters based on user selection
    function applyFilters() {
        const platformFilter = document.getElementById('f-platform').value;
        const ratingFilter = document.getElementById('f-rating').value;
        const searchFilter = document.getElementById('f-q').value.toLowerCase();

        const filtered = allReviews.filter(r => {
            const matchesPlatform = platformFilter === "" || r.platform === platformFilter;
            const matchesRating = ratingFilter === "" || r.rating.toString() === ratingFilter;
            const matchesSearch = searchFilter === "" || (r.text && r.text.toLowerCase().includes(searchFilter));
            
            return matchesPlatform && matchesRating && matchesSearch;
        });

        renderReviews(filtered);
    }

    // Attach Event Listeners to form filters
    document.getElementById('f-platform').addEventListener('change', applyFilters);
    document.getElementById('f-rating').addEventListener('change', applyFilters);
    document.getElementById('f-q').addEventListener('input', applyFilters);
    
    document.getElementById('f-reset').addEventListener('click', () => {
        filterForm.reset();
        applyFilters();
    });

    // Initial render
    renderReviews(allReviews);
});
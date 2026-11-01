document.addEventListener('DOMContentLoaded', async () => {
    // 1. Mobile Menu Logic
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn) {
        mobileBtn.addEventListener('click', function() {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }

    // 2. Auth Protection - Use window.reviewBoostClient (matching api.js)
    const { data: { session }, error: sessionError } = await window.reviewBoostClient.auth.getSession();
    if (sessionError || !session) {
        window.location.href = 'index.html';
        return;
    }

    const userId = session.user.id;

    // Fetch the business linked to this user
    const business = await fetchUserBusiness(userId);
    if (!business) return;

    // Load business name into header
    const nameHeading = document.getElementById('business-name-display');
    if (nameHeading) {
        nameHeading.textContent = business.name;
    }

    // Load initial dashboard data
    await loadDashboardStats(business.business_id);
    await loadRecentReviews(business.business_id);
    await loadCustomerDropdown(business.business_id);
    setupBusinessQRCode(business.business_id);

    // 3. Form Submission Listeners
    setupCustomerForm(business.business_id);
    setupSendRequestForm();
});

// --- HELPER FUNCTIONS ---

async function fetchUserBusiness(userId) {
    console.log("Fetching business for user ID:", userId);

    // 1. Try to fetch the business normally using maybeSingle() to avoid 406 errors
    let { data: business, error } = await window.reviewBoostClient
        .from('businesses')
        .select('business_id, name')
        .eq('user_id', userId)
        .maybeSingle();

    // 2. If no business exists for this user yet, create one automatically right now!
    if (!business) {
        console.warn("No business found for this user. Auto-creating a business record...");
        
        const { data: newBiz, error: createError } = await window.reviewBoostClient
            .from('businesses')
            .insert([{ 
                user_id: userId, 
                name: "My Business", 
                category: "General" 
            }])
            .select('business_id, name')
            .single();

        if (createError) {
            console.error("Failed to auto-create business:", createError.message);
            return null;
        }
        return newBiz;
    }

    return business;
}

async function loadDashboardStats(businessId) {
    try {
        const { data: reviews, error } = await window.reviewBoostClient
            .from('reviews')
            .select('*')
            .eq('business_id', businessId);

        if (error) throw error;

        const totalReviews = reviews.length;
        const avgRating = totalReviews > 0 
            ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1) 
            : "0.0";
        const pendingReplies = reviews.filter(r => !r.reply).length;

        const statCards = document.querySelectorAll('.stat-number');
        if (statCards.length >= 3) {
            statCards[0].textContent = totalReviews;
            statCards[1].innerHTML = `${avgRating} <span>/ 5</span>`;
            statCards[2].textContent = pendingReplies;
        }
    } catch (err) {
        console.error("Error loading stats:", err.message);
    }
}
// Add this function inside dashboard.js and call it after loading the business
function setupBusinessQRCode(businessId) {
    // Construct the public feedback URL for this specific business
    const publicFeedbackUrl = `${window.location.origin}/feedback.html?business_id=${businessId}`;
    
    // Set the input field text
    const linkInput = document.getElementById('public-link-input');
    if (linkInput) {
        linkInput.value = publicFeedbackUrl;
    }

    // Clear any existing QR code before generating a new one
    const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
        qrContainer.innerHTML = "";
        
        // Generate QR code using the CDN library
        new QRCode(qrContainer, {
            text: publicFeedbackUrl,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    // Copy link button handler
    const copyBtn = document.getElementById('copy-link-btn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(publicFeedbackUrl);
            alert("Feedback link copied to clipboard!");
        };
    }
}

async function loadRecentReviews(businessId) {
    try {
        const { data: reviews, error } = await window.reviewBoostClient
            .from('reviews')
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tbody = document.querySelector('.recent-reviews tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!reviews || reviews.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #6b7280;">No reviews found yet.</td></tr>`;
            return;
        }

        reviews.slice(0, 5).forEach(r => {
            const stars = '⭐'.repeat(r.rating);
            const dateFormatted = new Date(r.created_at).toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric', year: 'numeric' 
            });
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>Customer (${r.platform})</td>
                <td>${stars}</td>
                <td>"${r.text || 'No comment provided'}"</td>
                <td>${dateFormatted}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Error loading reviews table:", err.message);
    }
}

async function loadCustomerDropdown(businessId) {
    try {
        const { data: customers, error } = await window.reviewBoostClient
            .from('customers')
            .select('*')
            .eq('business_id', businessId);

        if (error) throw error;

        const select = document.getElementById('s-customer');
        if (!select) return;
        
        select.innerHTML = '';

        if (!customers || customers.length === 0) {
            select.appendChild(new Option("No customers yet", ""));
            return;
        }

        customers.forEach(c => {
            const label = `${c.name} (${c.phone}) ${c.consent ? '' : ' - no consent'}`;
            const option = new Option(label, c.customer_id);
            select.appendChild(option);
        });
    } catch (err) {
        console.error("Error loading customer dropdown:", err.message);
    }
}

function setupCustomerForm(businessId) {
    const form = document.getElementById('customer-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('c-name').value.trim();
        const phone = document.getElementById('c-phone').value.trim();
        const consent = document.getElementById('c-consent').checked;

        if (!name || !phone) {
            alert("Please enter both name and phone number.");
            return;
        }

        try {
            const { error } = await window.reviewBoostClient
                .from('customers')
                .insert([{
                    business_id: businessId,
                    name: name,
                    phone: phone.replace(/ /g, ""),
                    consent: consent
                }]);

            if (error) throw error;

            alert("Customer saved successfully!");
            form.reset();
            await loadCustomerDropdown(businessId);
        } catch (err) {
            console.error("Error saving customer:", err.message);
            alert("Failed to save customer.");
        }
    });
}

function setupSendRequestForm() {
    const form = document.getElementById('send-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customerId = document.getElementById('s-customer').value;
        const channel = document.getElementById('s-channel').value;

        if (!customerId) {
            alert("Please select a valid customer first.");
            return;
        }

        try {
            const { data: customer, error: custError } = await window.reviewBoostClient
                .from('customers')
                .select('*')
                .eq('customer_id', customerId)
                .single();

            if (custError || !customer) throw new Error("Customer not found.");

            if (!customer.consent) {
                alert("Action Blocked: This customer has not given consent to receive feedback requests.");
                return;
            }

            const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            const { error: reqError } = await window.reviewBoostClient
                .from('feedback_requests')
                .insert([{
                    customer_id: customer.customer_id,
                    token: token,
                    channel: channel,
                    status: 'Sent',
                    expires_at: expiresAt.toISOString()
                }]);

            if (reqError) throw reqError;

            const feedbackLink = `https://reviewboost.app/feedback.html?token=${token}`;
            console.log(`[Gateway Simulation - ${channel}] Sending link to ${customer.phone}: ${feedbackLink}`);
            
            alert(`Feedback request successfully sent via ${channel}!`);
        } catch (err) {
            console.error("Error sending feedback request:", err.message);
            alert("Failed to send request.");
        }
    });
    
}
function setupBusinessQRCode(businessId) {
    // Construct the direct link using the current domain
    const publicFeedbackUrl = `${window.location.origin}/feedback.html?business_id=${businessId}`;
    
    const linkInput = document.getElementById('public-link-input');
    if (linkInput) {
        linkInput.value = publicFeedbackUrl;
    }

    const qrContainer = document.getElementById('qrcode');
    if (qrContainer) {
        qrContainer.innerHTML = ""; // Clear any old code
        
        // Generate the QR code graphic
        new QRCode(qrContainer, {
            text: publicFeedbackUrl,
            width: 150,
            height: 150,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    const copyBtn = document.getElementById('copy-link-btn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(publicFeedbackUrl);
            alert("Feedback link copied to clipboard!");
        };
    }
}

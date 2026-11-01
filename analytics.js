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

    // 3. Fetch Data and Compute Analytics
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
            .order('created_at', { ascending: true });

        if (revError) throw revError;

        const allReviews = reviews || [];
        const totalReviews = allReviews.length;

        // Compute Average Rating
        const avgRating = totalReviews > 0 
            ? (allReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1) 
            : "0.0";

        // Compute Response Rate (% of reviews that have a reply)
        const repliedCount = allReviews.filter(r => r.reply !== null && r.reply !== "").length;
        const responseRate = totalReviews > 0 
            ? Math.round((repliedCount / totalReviews) * 100) 
            : 0;

        // Platform Breakdown Counts
        const googleCount = allReviews.filter(r => r.platform === 'Google').length;
        const facebookCount = allReviews.filter(r => r.platform === 'Facebook').length;
        const directCount = allReviews.filter(r => r.platform === 'Direct').length;

        // Update DOM Elements
        document.getElementById('stat-total').textContent = totalReviews;
        document.getElementById('stat-avg').textContent = avgRating;
        document.getElementById('stat-rate').textContent = `${responseRate}%`;

        // Update Platform Breakdown Cards if they exist
        const breakdowns = document.querySelectorAll('.platform-breakdown .stat-number');
        if (breakdowns.length >= 3) {
            breakdowns[0].innerHTML = `${googleCount} <span>reviews</span>`;
            breakdowns[1].innerHTML = `${facebookCount} <span>reviews</span>`;
            breakdowns[2].innerHTML = `${directCount} <span>reviews</span>`;
        }

        // Group reviews by month for the trend chart
        const monthlyData = computeMonthlyTrend(allReviews);
        drawTrendChart(monthlyData);

    } catch (error) {
        console.error("Error computing analytics:", error.message);
    }
});

// Helper to group reviews by month and compute average ratings per month
function computeMonthlyTrend(reviews) {
    const monthsMap = {};

    reviews.forEach(r => {
        const date = new Date(r.created_at);
        const monthName = date.toLocaleString('default', { month: 'short' }); // e.g., 'Oct'
        
        if (!monthsMap[monthName]) {
            monthsMap[monthName] = { total: 0, count: 0 };
        }
        monthsMap[monthName].total += r.rating;
        monthsMap[monthName].count += 1;
    });

    return Object.keys(monthsMap).map(month => ({
        month: month,
        avg: Number((monthsMap[month].total / monthsMap[month].count).toFixed(1))
    }));
}

// Function to build a lightweight SVG line chart
function drawTrendChart(points) {
    const box = document.getElementById('trend');
    if (!box) return;
    box.innerHTML = ''; 

    if (points.length < 2) {
        box.innerHTML = '<p style="color: #6b7280; text-align: center; padding-top: 80px;">Not enough data yet for a trend chart (need at least 2 months).</p>';
        return;
    }

    const W = box.clientWidth || 600;
    const H = box.clientHeight || 250;
    const padL = 40, padR = 20, padT = 20, padB = 30;
    
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");

    const x = (i) => padL + (i * (W - padL - padR)) / (points.length - 1);
    const y = (v) => padT + ((5 - v) * (H - padT - padB)) / 4; 

    const createNode = (name, attrs, text) => {
        const node = document.createElementNS(ns, name);
        Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
        if (text) node.textContent = text;
        return node;
    };

    [1, 2, 3, 4, 5].forEach((v) => {
        svg.appendChild(createNode("line", { x1: padL, x2: W - padR, y1: y(v), y2: y(v), stroke: "#e5e7eb", "stroke-width": "1" }));
        svg.appendChild(createNode("text", { x: padL - 10, y: y(v) + 4, "text-anchor": "end", "font-size": "12", fill: "#6b7280" }, String(v)));
    });

    const pathStr = points.map((p, i) => (i === 0 ? "M" : "L") + x(i) + " " + y(p.avg)).join(" ");
    svg.appendChild(createNode("path", { d: pathStr, fill: "none", stroke: "#2563eb", "stroke-width": "3", "stroke-linejoin": "round" }));

    points.forEach((p, i) => {
        svg.appendChild(createNode("circle", { cx: x(i), cy: y(p.avg), r: 5, fill: "#2563eb" }));
        svg.appendChild(createNode("text", { x: x(i), y: y(p.avg) - 15, "text-anchor": "middle", "font-size": "12", fill: "#1f2937", "font-weight": "bold" }, p.avg.toFixed(1)));
        svg.appendChild(createNode("text", { x: x(i), y: H - 5, "text-anchor": "middle", "font-size": "12", fill: "#6b7280" }, p.month));
    });

    box.appendChild(svg);
}
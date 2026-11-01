document.getElementById('signupForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const businessName = document.getElementById('businessName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitButton = document.querySelector('.primary-btn');

    submitButton.textContent = "Creating account...";
    submitButton.disabled = true;

    try {
        // 1. Sign up user with Supabase Auth
        const { data: authData, error: authError } = await window.reviewBoostClient.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) throw authError;

        const userId = authData.user.id;

        // 2. Explicitly insert the business name into your public 'businesses' table
        const { error: bizError } = await window.reviewBoostClient
            .from('businesses')
            .insert([{ 
                user_id: userId, 
                name: businessName, 
                category: 'General' 
            }]);

        if (bizError) throw bizError;

        alert("Account created successfully! Please log in.");
        window.location.href = 'login.html';

    } catch (error) {
        console.error("Sign up error:", error.message);
        alert("Error: " + error.message);
        submitButton.textContent = "Sign Up";
        submitButton.disabled = false;
    }
});
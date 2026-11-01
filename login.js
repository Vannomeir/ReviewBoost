document.getElementById('loginForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Stop page refresh

    const emailInput = document.getElementById('email').value.trim();
    const passwordInput = document.getElementById('password').value;
    const submitButton = document.querySelector('.primary-btn');
    const forgotContainer = document.getElementById('forgot-password-container');

    // Show loading state
    submitButton.textContent = "Signing in...";
    submitButton.disabled = true;

    try {
        // Authenticate using Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailInput,
            password: passwordInput,
        });

        if (error) throw error;

        // Login successful - redirect to dashboard
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error("Login error:", error.message);
        alert("Incorrect email or password. Please try again.");
        
        // Reveal the forgot password link after a failed attempt
        forgotContainer.innerHTML = `
            <a href="forgot-password.html" style="font-size: 13px; color: #2563eb; text-decoration: none;">
                Forgot your password?
            </a>
        `;
    } finally {
        // Always re-enable the button and restore text, regardless of success/fail
        submitButton.textContent = "Sign In";
        submitButton.disabled = false;
    }
});
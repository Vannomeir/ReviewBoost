document.getElementById('loginForm').addEventListener('submit', async function(e) {
    // 1. THIS IS THE MAGIC LINE: It stops the page from refreshing and erasing your details
    e.preventDefault(); 

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitButton = this.querySelector('button[type="submit"]');

    submitButton.textContent = "Logging in...";
    submitButton.disabled = true;

    try {
        // 2. Sign in using the ReviewBoost client
        const { data, error } = await window.reviewBoostClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        // 3. Success! Redirect exactly to the dashboard file
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error("Login error:", error.message);
        alert("Login failed: " + error.message);
        
        // Reset the button so the user can try again
        submitButton.textContent = "Log In";
        submitButton.disabled = false;
    }
});

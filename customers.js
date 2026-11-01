// Function to handle adding a new customer
async function handleAddCustomer(event) {
    event.preventDefault();

    const name = document.getElementById('c-name').value.trim();
    const phone = document.getElementById('c-phone').value.trim();
    const consent = document.getElementById('c-consent').checked;

    if (!name || !phone) {
        alert("Please enter both name and phone number.");
        return;
    }

    try {
        // 1. Get current user's business ID
        const { data: { session } } = await supabase.auth.getSession();
        const { data: business } = await supabase
            .from('businesses')
            .select('business_id')
            .eq('user_id', session.user.id)
            .single();

        if (!business) throw new Error("No business found for this user.");

        // 2. Insert customer into Supabase
        const { error } = await supabase
            .from('customers')
            .insert([{
                business_id: business.business_id,
                name: name,
                phone: phone.replace(/ /g, ""), // clean spaces
                consent: consent
            }]);

        if (error) throw error;

        alert("Customer saved successfully!");
        document.getElementById('customer-form').reset();
        
        // Refresh your customer dropdown list if applicable
        loadCustomerDropdown();

    } catch (err) {
        console.error("Error saving customer:", err.message);
        alert("Failed to save customer.");
    }
}
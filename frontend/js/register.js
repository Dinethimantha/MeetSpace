
document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    const registerBtn = document.getElementById("registerBtn");
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        errorMessage.style.display = "none";
        successMessage.style.display = "none";

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            errorMessage.textContent = "Passwords do not match.";
            errorMessage.style.display = "block";
            return;
        }

        if (password.length < 6) {
            errorMessage.textContent = "Password must be at least 6 characters.";
            errorMessage.style.display = "block";
            return;
        }

        registerBtn.disabled = true;
        registerBtn.innerHTML = "Creating account...";

        try {
            const response = await fetch("http://localhost:5000/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Registration failed.");
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            successMessage.textContent = "Account created successfully. Redirecting...";
            successMessage.style.display = "block";

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1000);

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = "block";

            registerBtn.disabled = false;
            registerBtn.innerHTML = 'Create Account <span>→</span>';
        }
    });
});

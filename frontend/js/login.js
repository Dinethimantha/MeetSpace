
document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");
    const errorMessage = document.getElementById("errorMessage");

    const existingToken = localStorage.getItem("token");

    if (existingToken) {
        window.location.href = "dashboard.html";
        return;
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        errorMessage.style.display = "none";

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        loginBtn.disabled = true;
        loginBtn.innerHTML = "Signing in...";

        try {
            const response = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Login failed");
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            window.location.href = "dashboard.html";

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = "block";

            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Sign In <span>→</span>';
        }
    });
});

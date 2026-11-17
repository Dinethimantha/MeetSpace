
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");

    const profileName = document.getElementById("profileName");
    const profileAvatar = document.getElementById("profileAvatar");
    const currentDate = document.getElementById("currentDate");
    const logoutBtn = document.getElementById("logoutBtn");

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    currentDate.textContent = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    try {
        const response = await fetch("http://localhost:5000/api/auth/me", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login.html";
            return;
        }

        const user = data.user;

        localStorage.setItem("user", JSON.stringify(user));

        profileName.textContent = user.name;
        profileAvatar.textContent = user.name.charAt(0).toUpperCase();

    } catch (error) {
        console.error("Dashboard authentication error:", error);
        alert("Unable to connect to the server. Please try again.");
    }

    logoutBtn.addEventListener("click", (event) => {
        event.preventDefault();

        if (confirm("Are you sure you want to logout?")) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            window.location.href = "login.html";
        }
    });
});

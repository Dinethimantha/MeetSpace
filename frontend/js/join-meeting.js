
const API_URL = "http://localhost:5000/api";

const token = localStorage.getItem("token");

const joinForm = document.getElementById("joinMeetingForm");
const meetingIdInput = document.getElementById("meetingId");
const joinButton = document.getElementById("joinMeetingBtn");
const errorMessage = document.getElementById("errorMessage");

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add("show");
}

function hideError() {
    errorMessage.textContent = "";
    errorMessage.classList.remove("show");
}

if (!token) {
    window.location.href = "login.html";
}

async function loadUserProfile() {
    try {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login.html";
            return;
        }

        const user = data.user || data;

        document.getElementById("profileName").textContent = user.name || "User";

        document.getElementById("profileAvatar").textContent =
            user.name ? user.name.charAt(0).toUpperCase() : "U";

        localStorage.setItem("user", JSON.stringify(user));

    } catch (error) {
        console.error("Profile loading error:", error);
    }
}

loadUserProfile();

meetingIdInput.addEventListener("input", () => {
    meetingIdInput.value = meetingIdInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    hideError();
});

joinForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    hideError();

    const meetingId = meetingIdInput.value.trim().toUpperCase();

    if (!meetingId) {
        showError("Please enter a meeting ID.");
        return;
    }

    if (meetingId.length !== 8) {
        showError("Meeting ID must contain 8 characters.");
        return;
    }

    joinButton.disabled = true;
    joinButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Joining...';

    try {
        const response = await fetch(`${API_URL}/meetings/join`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ meetingId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || data.error || "Unable to join meeting.");
        }

        window.location.href = `meeting.html?meetingId=${encodeURIComponent(meetingId)}`;

    } catch (error) {
        showError(error.message || "Something went wrong. Please try again.");

        joinButton.disabled = false;
        joinButton.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Join Meeting';
    }
});

document.getElementById("logoutBtn").addEventListener("click", (event) => {
    event.preventDefault();

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "login.html";
});

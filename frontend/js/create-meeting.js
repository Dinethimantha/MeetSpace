
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");

    const profileName = document.getElementById("profileName");
    const profileAvatar = document.getElementById("profileAvatar");
    const logoutBtn = document.getElementById("logoutBtn");

    const createForm = document.getElementById("createMeetingForm");
    const createBtn = document.getElementById("createMeetingBtn");
    const meetingTitle = document.getElementById("meetingTitle");

    const errorMessage = document.getElementById("errorMessage");
    const meetingResult = document.getElementById("meetingResult");
    const generatedMeetingId = document.getElementById("generatedMeetingId");
    const copyMeetingId = document.getElementById("copyMeetingId");
    const startMeetingBtn = document.getElementById("startMeetingBtn");

    let currentMeetingId = "";

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/api/auth/me", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login.html";
            return;
        }

        profileName.textContent = data.user.name;
        profileAvatar.textContent = data.user.name.charAt(0).toUpperCase();

        localStorage.setItem("user", JSON.stringify(data.user));

    } catch (error) {
        errorMessage.textContent = "Unable to connect to the server. Please try again.";
        errorMessage.style.display = "block";
        createBtn.disabled = true;
        return;
    }

    createForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        errorMessage.style.display = "none";
        meetingResult.style.display = "none";

        const title = meetingTitle.value.trim();

        if (!title) {
            errorMessage.textContent = "Please enter a meeting title.";
            errorMessage.style.display = "block";
            return;
        }

        createBtn.disabled = true;
        createBtn.innerHTML = "Creating Meeting...";

        try {
            const response = await fetch("http://localhost:5000/api/meetings/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ title })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to create meeting.");
            }

            currentMeetingId = data.meeting.meetingId;

            generatedMeetingId.textContent = currentMeetingId;
            meetingResult.style.display = "block";

            meetingTitle.value = "";

        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = "block";

        } finally {
            createBtn.disabled = false;
            createBtn.innerHTML = 'Create Meeting <span>→</span>';
        }
    });

    copyMeetingId.addEventListener("click", async () => {
        if (!currentMeetingId) return;

        try {
            await navigator.clipboard.writeText(currentMeetingId);
            copyMeetingId.textContent = "Copied!";
        } catch (error) {
            copyMeetingId.textContent = "Copy failed";
        }

        setTimeout(() => {
            copyMeetingId.textContent = "Copy";
        }, 2000);
    });

    startMeetingBtn.addEventListener("click", () => {
        if (!currentMeetingId) return;

        window.location.href =
            `meeting.html?meetingId=${encodeURIComponent(currentMeetingId)}`;
    });

    logoutBtn.addEventListener("click", (event) => {
        event.preventDefault();

        if (confirm("Are you sure you want to logout?")) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login.html";
        }
    });
});

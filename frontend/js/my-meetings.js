
const API_URL = "http://localhost:5000/api";

const token = localStorage.getItem("token");

const meetingsList = document.getElementById("meetingsList");
const meetingSearch = document.getElementById("meetingSearch");
const meetingFilter = document.getElementById("meetingFilter");
const refreshMeetingsBtn = document.getElementById("refreshMeetingsBtn");

let allMeetings = [];

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function getUserData() {
    try {
        return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
        return {};
    }
}

function loadProfile() {
    const user = getUserData();
    const name = user.name || user.fullName || "User";

    document.getElementById("profileName").textContent = name;
    document.getElementById("profileAvatar").textContent =
        name.charAt(0).toUpperCase() || "U";
}

function formatDate(date) {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Date unavailable";
    }

    return parsedDate.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function updateStats(meetings) {
    const active = meetings.filter(meeting => meeting.isActive);
    const ended = meetings.filter(meeting => !meeting.isActive);

    const participantTotal = meetings.reduce((total, meeting) => {
        return total + (Array.isArray(meeting.participants)
            ? meeting.participants.length
            : 0);
    }, 0);

    document.getElementById("totalMeetings").textContent = meetings.length;
    document.getElementById("activeMeetings").textContent = active.length;
    document.getElementById("endedMeetings").textContent = ended.length;
    document.getElementById("totalParticipants").textContent = participantTotal;
}

function renderMeetings(meetings) {
    if (!meetings.length) {
        meetingsList.innerHTML = `
            <div class="meetings-empty">
                <div class="meetings-empty-icon">
                    <i class="fa-solid fa-calendar-xmark"></i>
                </div>
                <h3>No meetings found</h3>
                <p>Your created and joined meetings will appear here.</p>
            </div>
        `;
        return;
    }

    meetingsList.innerHTML = meetings.map(meeting => {
        const isActive = meeting.isActive;
        const hostName = meeting.host?.name || "Unknown host";
        const participantCount = Array.isArray(meeting.participants)
            ? meeting.participants.length
            : 0;

        const statusHTML = isActive
            ? `<span class="meeting-status active">
                    <i class="fa-solid fa-circle"></i> Active
               </span>`
            : `<span class="meeting-status ended">
                    <i class="fa-solid fa-circle-check"></i> Ended
               </span>`;

        const actionHTML = isActive
            ? `<button class="meeting-action-btn join-btn"
                       type="button"
                       data-action="join"
                       data-id="${escapeHTML(meeting.meetingId)}">
                    <i class="fa-solid fa-video"></i> Join
               </button>`
            : "";

        return `
            <div class="meeting-item">
                <div class="meeting-item-left">
                    <div class="meeting-item-icon">
                        <i class="fa-solid fa-video"></i>
                    </div>

                    <div class="meeting-item-details">
                        <h3>${escapeHTML(meeting.title)}</h3>

                        <div class="meeting-item-meta">
                            <span>
                                <i class="fa-solid fa-hashtag"></i>
                                ${escapeHTML(meeting.meetingId)}
                            </span>

                            <span>
                                <i class="fa-solid fa-user"></i>
                                ${escapeHTML(hostName)}
                            </span>

                            <span>
                                <i class="fa-solid fa-users"></i>
                                ${participantCount} participants
                            </span>

                            <span>
                                <i class="fa-regular fa-calendar"></i>
                                ${escapeHTML(formatDate(meeting.startedAt))}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="meeting-item-right">
                    ${statusHTML}

                    <button class="meeting-action-btn"
                            type="button"
                            data-action="copy"
                            data-id="${escapeHTML(meeting.meetingId)}">
                        <i class="fa-regular fa-copy"></i> Copy ID
                    </button>

                    ${actionHTML}
                </div>
            </div>
        `;
    }).join("");
}

function applyFilters() {
    const searchValue = meetingSearch.value.trim().toLowerCase();
    const filterValue = meetingFilter.value;

    const filteredMeetings = allMeetings.filter(meeting => {
        const title = (meeting.title || "").toLowerCase();
        const meetingId = (meeting.meetingId || "").toLowerCase();

        const matchesSearch =
            title.includes(searchValue) ||
            meetingId.includes(searchValue);

        const matchesFilter =
            filterValue === "all" ||
            (filterValue === "active" && meeting.isActive) ||
            (filterValue === "ended" && !meeting.isActive);

        return matchesSearch && matchesFilter;
    });

    renderMeetings(filteredMeetings);
}

async function loadMeetings() {
    if (!token) {
        window.location.href = "login.html";
        return;
    }

    meetingsList.innerHTML = `
        <div class="meetings-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Loading your meetings...</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}/meetings/my`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login.html";
            return;
        }

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load meetings");
        }

        allMeetings = Array.isArray(data.meetings) ? data.meetings : [];

        updateStats(allMeetings);
        applyFilters();

    } catch (error) {
        console.error("Load meetings error:", error);

        meetingsList.innerHTML = `
            <div class="meetings-error">
                <div class="meetings-error-icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3>Unable to load meetings</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}

async function joinMeeting(meetingId) {
    try {
        const response = await fetch(`${API_URL}/meetings/join`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ meetingId })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to join meeting");
        }

        window.location.href =
            `meeting.html?meetingId=${encodeURIComponent(meetingId)}`;

    } catch (error) {
        alert(error.message);
    }
}

meetingsList.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const action = button.dataset.action;
    const meetingId = button.dataset.id;

    if (action === "copy") {
        try {
            await navigator.clipboard.writeText(meetingId);
            alert("Meeting ID copied successfully!");
        } catch {
            alert("Unable to copy Meeting ID.");
        }
    }

    if (action === "join") {
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Joining...';
        await joinMeeting(meetingId);
        button.disabled = false;
    }
});

meetingSearch.addEventListener("input", applyFilters);
meetingFilter.addEventListener("change", applyFilters);
refreshMeetingsBtn.addEventListener("click", loadMeetings);

document.getElementById("logoutBtn").addEventListener("click", event => {
    event.preventDefault();

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "login.html";
});

document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

loadProfile();
loadMeetings();

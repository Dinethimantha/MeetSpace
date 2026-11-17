
const API_URL = "http://localhost:5000/api";
const token = localStorage.getItem("token");

const historyContainer = document.getElementById("historyContainer");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

let meetings = [];

if (!token) {
    window.location.href = "login.html";
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function formatDate(date) {
    if (!date) return "Date unavailable";

    return new Date(date).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDuration(seconds) {
    seconds = Number(seconds) || 0;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }

    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }

    return `${remainingSeconds}s`;
}

function updateStats() {
    document.getElementById("totalMeetings").textContent = meetings.length;

    document.getElementById("completedMeetings").textContent =
        meetings.filter(meeting => !meeting.isActive).length;

    document.getElementById("activeMeetings").textContent =
        meetings.filter(meeting => meeting.isActive).length;

    const participantEntries = meetings.reduce((total, meeting) => {
        return total + (meeting.participants?.length || 0);
    }, 0);

    document.getElementById("totalParticipants").textContent = participantEntries;
}

function renderMeetings() {
    const search = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;

    const filteredMeetings = meetings.filter(meeting => {
        const matchesSearch =
            (meeting.title || "").toLowerCase().includes(search) ||
            (meeting.meetingId || "").toLowerCase().includes(search);

        const matchesStatus =
            selectedStatus === "all" ||
            (selectedStatus === "active" && meeting.isActive) ||
            (selectedStatus === "completed" && !meeting.isActive);

        return matchesSearch && matchesStatus;
    });

    if (filteredMeetings.length === 0) {
        historyContainer.innerHTML = `
            <div class="history-empty">
                <div class="empty-icon">
                    <i class="fa-solid fa-calendar-xmark"></i>
                </div>
                <h3>No meetings found</h3>
                <p>Your meeting history will appear here.</p>
            </div>
        `;
        return;
    }

    historyContainer.innerHTML = `
        <div class="history-list">
            ${filteredMeetings.map(meeting => {
                const hostName = meeting.host?.name || "Unknown";
                const participantCount = meeting.participants?.length || 0;

                const duration = meeting.isActive
                    ? Math.max(0, Math.floor(
                        (Date.now() - new Date(meeting.startedAt).getTime()) / 1000
                    ))
                    : meeting.duration;

                return `
                    <div class="history-row">
                        <div class="history-meeting-info">
                            <div class="history-meeting-icon">
                                <i class="fa-solid fa-video"></i>
                            </div>

                            <div class="history-meeting-details">
                                <h3>${escapeHTML(meeting.title)}</h3>
                                <p>
                                    Meeting ID: ${escapeHTML(meeting.meetingId)}
                                    <br>
                                    Host: ${escapeHTML(hostName)}
                                    <br>
                                    ${formatDate(meeting.startedAt)} · ${participantCount} participants
                                </p>
                            </div>
                        </div>

                        <div class="history-row-right">
                            <span class="history-duration">
                                <i class="fa-regular fa-clock"></i>
                                ${formatDuration(duration)}
                            </span>

                            <span class="history-status ${meeting.isActive ? "active" : "completed"}">
                                ${meeting.isActive ? "Active" : "Completed"}
                            </span>

                            <button class="history-copy-btn"
                                data-meeting-id="${escapeHTML(meeting.meetingId)}">
                                <i class="fa-regular fa-copy"></i> Copy ID
                            </button>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

async function loadMeetingHistory() {
    historyContainer.innerHTML = `
        <div class="history-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Loading meeting history...</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}/meetings/my`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            window.location.href = "login.html";
            return;
        }

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load meeting history");
        }

        meetings = data.meetings || [];

        updateStats();
        renderMeetings();

    } catch (error) {
        console.error("Meeting history error:", error);

        historyContainer.innerHTML = `
            <div class="history-error">
                <div class="empty-icon">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <h3>Unable to load meetings</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}

async function copyMeetingId(meetingId) {
    try {
        await navigator.clipboard.writeText(meetingId);
        alert("Meeting ID copied successfully!");
    } catch (error) {
        const input = document.createElement("input");
        input.value = meetingId;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
        alert("Meeting ID copied successfully!");
    }
}

historyContainer.addEventListener("click", event => {
    const button = event.target.closest(".history-copy-btn");

    if (button) {
        copyMeetingId(button.dataset.meetingId);
    }
});

searchInput.addEventListener("input", renderMeetings);
statusFilter.addEventListener("change", renderMeetings);

document.getElementById("refreshBtn").addEventListener("click", loadMeetingHistory);

document.getElementById("logoutBtn").addEventListener("click", event => {
    event.preventDefault();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
});

const user = JSON.parse(localStorage.getItem("user") || "null");

if (user) {
    const name = user.name || user.username || "User";

    document.getElementById("profileName").textContent = name;
    document.getElementById("profileAvatar").textContent =
        name.charAt(0).toUpperCase();
}

document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

loadMeetingHistory();

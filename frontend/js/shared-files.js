
const API_URL = "http://localhost:5000/api";

const token = localStorage.getItem("token");

const meetingSelect = document.getElementById("meetingSelect");
const fileSearch = document.getElementById("fileSearch");
const uploadBtn = document.getElementById("uploadBtn");
const filesContainer = document.getElementById("filesContainer");

let meetings = [];
let sharedFiles = [];

const getHeaders = () => ({
    Authorization: `Bearer ${token}`
});

const formatFileSize = bytes => {
    if (!bytes) return "0 KB";

    if (bytes < 1024) {
        return `${bytes} Bytes`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDate = date => {
    return new Date(date).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

const showError = message => {
    Swal.fire({
        icon: "error",
        title: "Something went wrong",
        text: message
    });
};

const getFileIcon = file => {
    const extension = file.originalName.split(".").pop().toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
        return {
            icon: "fa-image",
            className: "image"
        };
    }

    if (extension === "pdf") {
        return {
            icon: "fa-file-pdf",
            className: "pdf"
        };
    }

    if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"].includes(extension)) {
        return {
            icon: "fa-file-lines",
            className: "document"
        };
    }

    if (extension === "zip") {
        return {
            icon: "fa-file-zipper",
            className: "archive"
        };
    }

    return {
        icon: "fa-file",
        className: "document"
    };
};

const loadMeetings = async () => {
    try {
        const response = await fetch(`${API_URL}/meetings/my`, {
            headers: getHeaders()
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to load meetings");
        }

        meetings = data.meetings || data.data || [];

        meetingSelect.innerHTML = '<option value="">Select a meeting</option>';

        if (meetings.length === 0) {
            meetingSelect.innerHTML = '<option value="">No meetings available</option>';
            renderEmptyState(
                "No Meetings Found",
                "Create or join a meeting to share files."
            );
            return;
        }

        meetings.forEach(meeting => {
            const option = document.createElement("option");

            option.value = meeting.meetingId;
            option.textContent = `${meeting.title} (${meeting.meetingId})`;

            meetingSelect.appendChild(option);
        });

        const selectedMeeting = new URLSearchParams(window.location.search)
            .get("meetingId");

        if (selectedMeeting) {
            const matchingMeeting = meetings.find(
                meeting => meeting.meetingId === selectedMeeting
            );

            if (matchingMeeting) {
                meetingSelect.value = matchingMeeting.meetingId;
                await loadMeetingFiles();
            }
        }

    } catch (error) {
        console.error("Load meetings error:", error);
        showError(error.message);
    }
};

const loadMeetingFiles = async () => {
    const meetingId = meetingSelect.value;

    if (!meetingId) {
        sharedFiles = [];
        updateStats();
        renderEmptyState(
            "No Meeting Selected",
            "Select a meeting to view its shared files."
        );
        return;
    }

    filesContainer.innerHTML = '<div class="files-loading"><i class="fa-solid fa-spinner fa-spin"></i> Loading files...</div>';

    try {
        const response = await fetch(
            `${API_URL}/shared-files/meeting/${encodeURIComponent(meetingId)}`,
            {
                headers: getHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to load shared files");
        }

        sharedFiles = data.files || [];

        const selectedMeeting = meetings.find(
            meeting => meeting.meetingId === meetingId
        );

        document.getElementById("selectedMeetingText").textContent =
            selectedMeeting
                ? `${selectedMeeting.title} · ${meetingId}`
                : `Meeting ID: ${meetingId}`;

        renderFiles();
        updateStats();

    } catch (error) {
        console.error("Load shared files error:", error);

        filesContainer.innerHTML = `
            <div class="files-empty">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <h3>Unable to Load Files</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
};

const escapeHTML = value => {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
};

const renderEmptyState = (title, description) => {
    filesContainer.innerHTML = `
        <div class="files-empty">
            <i class="fa-solid fa-folder-open"></i>
            <h3>${escapeHTML(title)}</h3>
            <p>${escapeHTML(description)}</p>
        </div>
    `;

    document.getElementById("selectedMeetingText").textContent =
        "Select a meeting to view its shared files.";

    document.getElementById("fileCount").textContent = "0 Files";
};

const renderFiles = () => {
    const searchText = fileSearch.value.trim().toLowerCase();

    const filteredFiles = sharedFiles.filter(file =>
        file.originalName.toLowerCase().includes(searchText)
    );

    document.getElementById("fileCount").textContent =
        `${filteredFiles.length} ${filteredFiles.length === 1 ? "File" : "Files"}`;

    if (filteredFiles.length === 0) {
        renderEmptyState(
            sharedFiles.length === 0 ? "No Shared Files Yet" : "No Matching Files",
            sharedFiles.length === 0
                ? "Upload a file to share it with meeting participants."
                : "Try searching with a different file name."
        );

        return;
    }

    filesContainer.innerHTML = filteredFiles.map(file => {
        const fileIcon = getFileIcon(file);
        const uploader = file.uploadedBy?.name || "Unknown User";

        return `
            <div class="file-item">
                <div class="file-type-icon ${fileIcon.className}">
                    <i class="fa-solid ${fileIcon.icon}"></i>
                </div>

                <div class="file-details">
                    <h4>${escapeHTML(file.originalName)}</h4>
                    <p>
                        ${formatFileSize(file.fileSize)}
                        · Uploaded by ${escapeHTML(uploader)}
                        · ${formatDate(file.createdAt)}
                    </p>
                </div>

                <div class="file-actions">
                    <button
                        class="file-action-btn"
                        title="Download file"
                        data-action="download"
                        data-id="${escapeHTML(file._id)}"
                    >
                        <i class="fa-solid fa-download"></i>
                    </button>

                    <button
                        class="file-action-btn delete"
                        title="Delete file"
                        data-action="delete"
                        data-id="${escapeHTML(file._id)}"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join("");
};

const updateStats = () => {
    const totalSize = sharedFiles.reduce(
        (total, file) => total + (file.fileSize || 0),
        0
    );

    document.getElementById("totalFiles").textContent = sharedFiles.length;
    document.getElementById("totalStorage").textContent =
        formatFileSize(totalSize);
};

const uploadFile = async file => {
    const meetingId = meetingSelect.value;

    if (!meetingId) {
        Swal.fire({
            icon: "warning",
            title: "Select a Meeting",
            text: "Please select a meeting before uploading a file."
        });
        return;
    }

    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        showError("File size must not exceed 10 MB.");
        return;
    }

    const formData = new FormData();
    formData.append("meetingId", meetingId);
    formData.append("file", file);

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';

    try {
        const response = await fetch(`${API_URL}/shared-files/upload`, {
            method: "POST",
            headers: getHeaders(),
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "File upload failed");
        }

        await Swal.fire({
            icon: "success",
            title: "Upload Successful",
            text: data.message || "File uploaded successfully."
        });

        await loadMeetingFiles();

    } catch (error) {
        console.error("Upload file error:", error);
        showError(error.message);

    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Upload File';
    }
};

const downloadFile = async fileId => {
    try {
        const response = await fetch(
            `${API_URL}/shared-files/download/${encodeURIComponent(fileId)}`,
            {
                headers: getHeaders()
            }
        );

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Download failed");
        }

        const blob = await response.blob();
        const fileUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = fileUrl;

        const file = sharedFiles.find(item => item._id === fileId);
        link.download = file ? file.originalName : "download";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(fileUrl);

    } catch (error) {
        console.error("Download file error:", error);
        showError(error.message);
    }
};

const deleteFile = async fileId => {
    const result = await Swal.fire({
        title: "Delete this file?",
        text: "This file will be permanently deleted.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#e74c3c",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Yes, delete it",
        cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch(
            `${API_URL}/shared-files/${encodeURIComponent(fileId)}`,
            {
                method: "DELETE",
                headers: getHeaders()
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Delete failed");
        }

        await Swal.fire({
            icon: "success",
            title: "Deleted",
            text: data.message || "File deleted successfully."
        });

        await loadMeetingFiles();

    } catch (error) {
        console.error("Delete file error:", error);
        showError(error.message);
    }
};

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip";
fileInput.hidden = true;
document.body.appendChild(fileInput);

uploadBtn.addEventListener("click", () => {
    if (!meetingSelect.value) {
        Swal.fire({
            icon: "warning",
            title: "Select a Meeting",
            text: "Please select a meeting before uploading a file."
        });
        return;
    }

    const selectedMeeting = meetings.find(
        meeting => meeting.meetingId === meetingSelect.value
    );

    if (selectedMeeting && !selectedMeeting.isActive) {
        Swal.fire({
            icon: "warning",
            title: "Meeting Ended",
            text: "Files cannot be uploaded to an ended meeting."
        });
        return;
    }

    fileInput.click();
});

fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];

    if (file) {
        await uploadFile(file);
    }

    fileInput.value = "";
});

meetingSelect.addEventListener("change", loadMeetingFiles);

fileSearch.addEventListener("input", renderFiles);

filesContainer.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) return;

    const fileId = button.dataset.id;

    if (button.dataset.action === "download") {
        downloadFile(fileId);
    }

    if (button.dataset.action === "delete") {
        deleteFile(fileId);
    }
});

document.getElementById("logoutBtn").addEventListener("click", event => {
    event.preventDefault();

    Swal.fire({
        title: "Logout?",
        text: "Are you sure you want to logout?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Logout"
    }).then(result => {
        if (result.isConfirmed) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "login.html";
        }
    });
});

const loadProfile = () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) return;

    try {
        const user = JSON.parse(storedUser);

        const name = user.name || user.fullName || "User";

        document.getElementById("profileName").textContent = name;
        document.getElementById("profileAvatar").textContent =
            name.charAt(0).toUpperCase();

    } catch (error) {
        console.error("Profile data error:", error);
    }
};

if (!token) {
    window.location.href = "login.html";
} else {
    loadProfile();
    loadMeetings();
}

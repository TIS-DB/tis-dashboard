let viewState = {
    level: "summary",
    selectedCourse: null
};

let rawData = [];

// ---------------- INIT ----------------
document.addEventListener("DOMContentLoaded", async function () {
    const res = await fetch("data/enrollments.json");
    rawData = await res.json();

    render();
});

// ---------------- RENDER ENGINE ----------------
function render() {
    renderBreadcrumb();
    renderHeader();
    renderTable();
}

// ---------------- HEADER ----------------
function renderHeader() {
    const head = document.getElementById("tableHead");

    if (viewState.level === "summary") {
        head.innerHTML = `
        <tr>
            <th>Course</th>
            <th>Total Students</th>
            <th>Total Revenue</th>
        </tr>`;
    }

    if (viewState.level === "course") {
        head.innerHTML = `
        <tr>
            <th>Student</th>
            <th>Category</th>
            <th>Type</th>
            <th>Date</th>
            <th>Fee</th>
        </tr>`;
    }
}

// ---------------- TABLE ----------------
function renderTable() {
    const body = document.getElementById("tableBody");
    body.innerHTML = "";

    if (viewState.level === "summary") {
        const summary = groupByCourse(rawData);

        summary.forEach(item => {
            body.innerHTML += `
            <tr onclick="drillToCourse('${item.course}')">
                <td>${item.course}</td>
                <td>${item.count}</td>
                <td>₹${item.revenue}</td>
            </tr>`;
        });
    }

    if (viewState.level === "course") {
        const filtered = rawData.filter(r => r.course === viewState.selectedCourse);

        filtered.forEach(r => {
            body.innerHTML += `
            <tr>
                <td>${r.student || ""}</td>
                <td>${r.category || ""}</td>
                <td>${r.type || ""}</td>
                <td>${r.enrolment_date || ""}</td>
                <td>₹${r.course_fee || 0}</td>
            </tr>`;
        });
    }
}

// ---------------- DRILL DOWN ----------------
function drillToCourse(course) {
    viewState.level = "course";
    viewState.selectedCourse = course;
    render();
}

// ---------------- BACK ----------------
function goHome() {
    viewState.level = "summary";
    viewState.selectedCourse = null;
    render();
}

// ---------------- BREADCRUMB ----------------
function renderBreadcrumb() {
    const b = document.getElementById("breadcrumb");

    if (viewState.level === "summary") {
        b.innerHTML = "Home";
    }

    if (viewState.level === "course") {
        b.innerHTML = `
        <span onclick="goHome()">Home</span>
        &nbsp;>&nbsp; ${viewState.selectedCourse}`;
    }
}

// ---------------- GROUPING LOGIC ----------------
function groupByCourse(data) {
    const map = {};

    data.forEach(r => {
        const course = r.course || "Unknown";

        if (!map[course]) {
            map[course] = { course, count: 0, revenue: 0 };
        }

        map[course].count += 1;
        map[course].revenue += Number(r.course_fee || 0);
    });

    return Object.values(map);
}

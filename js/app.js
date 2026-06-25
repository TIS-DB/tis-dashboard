console.log("🔥 APP.JS IS LOADING");
let rawData = [];

let state = {
    level: "summary",
    selectedCourse: null
};

// ---------------- INIT ----------------
document.addEventListener("DOMContentLoaded", async () => {
    const res = await fetch("data/enrollments.json");
    rawData = await res.json();

    render();
});

// ---------------- MAIN RENDER ----------------
function render() {
    renderBreadcrumb();
    renderHeader();
    renderTable();
    renderKPI();
}

// ---------------- KPI ----------------
function renderKPI() {
    const totalRevenue = rawData.reduce((sum, r) =>
        sum + Number(r.course_fee || 0), 0);

    document.getElementById("totalRevenue").innerText =
        "₹" + totalRevenue.toLocaleString();

    document.getElementById("totalStudents").innerText =
        rawData.length;

    document.getElementById("avgRevenue").innerText =
        "₹" + Math.round(totalRevenue / rawData.length || 0);
}

// ---------------- HEADER ----------------
function renderHeader() {
    const head = document.getElementById("tableHead");

    if (state.level === "summary") {
        head.innerHTML = `
        <tr>
            <th>Course</th>
            <th>Students</th>
            <th>Revenue</th>
        </tr>`;
    }

    if (state.level === "course") {
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

    if (state.level === "summary") {
        const grouped = groupByCourse(rawData);

        grouped.forEach(r => {
            body.innerHTML += `
            <tr onclick="drillToCourse('${r.course}')">
                <td>${r.course}</td>
                <td>${r.count}</td>
                <td>₹${r.revenue.toLocaleString()}</td>
            </tr>`;
        });
    }

    if (state.level === "course") {
        const filtered = rawData.filter(r =>
            r.course_name === state.selectedCourse
        );

        filtered.forEach(r => {
            body.innerHTML += `
            <tr>
                <td>${r.student_name}</td>
                <td>${r.course_category}</td>
                <td>${r["new/existing"]}</td>
                <td>${r.enrolment_date}</td>
                <td>₹${r.course_fee}</td>
            </tr>`;
        });
    }
}

// ---------------- GROUP BY COURSE ----------------
function groupByCourse(data) {
    const map = {};

    data.forEach(r => {

        const course = r.course_name || "Unknown";
        const fee = Number(r.course_fee || 0);

        if (!map[course]) {
            map[course] = {
                course,
                count: 0,
                revenue: 0
            };
        }

        map[course].count += 1;
        map[course].revenue += fee;
    });

    return Object.values(map);
}

// ---------------- DRILL DOWN ----------------
function drillToCourse(course) {
    state.level = "course";
    state.selectedCourse = course;
    render();
}

// ---------------- BACK ----------------
function goHome() {
    state.level = "summary";
    state.selectedCourse = null;
    render();
}

// ---------------- BREADCRUMB ----------------
function renderBreadcrumb() {
    const b = document.getElementById("breadcrumb");

    if (state.level === "summary") {
        b.innerHTML = "Home";
    } else {
        b.innerHTML = `<span onclick="goHome()" style="cursor:pointer;">Home</span> > ${state.selectedCourse}`;
    }
}

// expose functions for HTML onclick
window.drillToCourse = drillToCourse;
window.goHome = goHome;

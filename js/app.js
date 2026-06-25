let rawData = [];

let state = {
    level: "category",   // START FROM CATEGORY (changed)
    selectedCategory: null,
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

// ---------------- KPI (GLOBAL) ----------------
function renderKPI() {
    const totalRevenue = rawData.reduce((s, r) =>
        s + Number(r.course_fee || 0), 0);

    document.getElementById("totalRevenue").innerText =
        "₹" + totalRevenue.toLocaleString();

    document.getElementById("totalStudents").innerText =
        rawData.length;
}

// ---------------- HEADER ----------------
function renderHeader() {

    const head = document.getElementById("tableHead");

    if (state.level === "category") {
        head.innerHTML = `
        <tr>
            <th>Category</th>
            <th>Students</th>
            <th>Revenue</th>
        </tr>`;
    }

    if (state.level === "course") {
        head.innerHTML = `
        <tr>
            <th>Course</th>
            <th>Students</th>
            <th>Revenue</th>
        </tr>`;
    }

    if (state.level === "student") {
        head.innerHTML = `
        <tr>
            <th>Student</th>
            <th>Course</th>
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

    // LEVEL 1 → CATEGORY
    if (state.level === "category") {
        const grouped = groupByCategory(rawData);

        grouped.forEach(r => {
            body.innerHTML += `
            <tr onclick="drillToCourse('${r.category}')">
                <td>${r.category}</td>
                <td>${r.count}</td>
                <td>₹${r.revenue.toLocaleString()}</td>
            </tr>`;
        });
    }

    // LEVEL 2 → COURSE (inside category)
    if (state.level === "course") {
        const filtered = rawData.filter(r =>
            r.course_category === state.selectedCategory
        );

        const grouped = groupByCourse(filtered);

        grouped.forEach(r => {
            body.innerHTML += `
            <tr onclick="drillToStudent('${r.course}')">
                <td>${r.course}</td>
                <td>${r.count}</td>
                <td>₹${r.revenue.toLocaleString()}</td>
            </tr>`;
        });
    }

    // LEVEL 3 → STUDENT
    if (state.level === "student") {

        const filtered = rawData.filter(r =>
            r.course_name === state.selectedCourse
        );

        filtered.forEach(r => {
            body.innerHTML += `
            <tr>
                <td>${r.student_name}</td>
                <td>${r.course_name}</td>
                <td>${r.course_category}</td>
                <td>${r["new/existing"]}</td>
                <td>${r.enrolment_date}</td>
                <td>₹${r.course_fee}</td>
            </tr>`;
        });
    }
}

// ---------------- GROUP BY CATEGORY ----------------
function groupByCategory(data) {
    const map = {};

    data.forEach(r => {
        const cat = r.course_category;

        if (!map[cat]) {
            map[cat] = { category: cat, count: 0, revenue: 0 };
        }

        map[cat].count++;
        map[cat].revenue += Number(r.course_fee || 0);
    });

    return Object.values(map);
}

// ---------------- GROUP BY COURSE ----------------
function groupByCourse(data) {
    const map = {};

    data.forEach(r => {
        const course = r.course_name;

        if (!map[course]) {
            map[course] = { course, count: 0, revenue: 0 };
        }

        map[course].count++;
        map[course].revenue += Number(r.course_fee || 0);
    });

    return Object.values(map);
}

// ---------------- DRILL FUNCTIONS ----------------
function drillToCourse(category) {
    state.level = "course";
    state.selectedCategory = category;
    render();
}

function drillToStudent(course) {
    state.level = "student";
    state.selectedCourse = course;
    render();
}

// ---------------- BACK NAVIGATION ----------------
function goHome() {
    state.level = "category";
    state.selectedCategory = null;
    state.selectedCourse = null;
    render();
}

// ---------------- BREADCRUMB ----------------
function renderBreadcrumb() {

    const b = document.getElementById("breadcrumb");

    if (state.level === "category") {
        b.innerHTML = "Home (Category View)";
    }

    if (state.level === "course") {
        b.innerHTML = `
        <span onclick="goHome()" style="cursor:pointer;">Home</span>
        &nbsp;>&nbsp; ${state.selectedCategory}`;
    }

    if (state.level === "student") {
        b.innerHTML = `
        <span onclick="goHome()" style="cursor:pointer;">Home</span>
        &nbsp;>&nbsp; ${state.selectedCategory}
        &nbsp;>&nbsp; ${state.selectedCourse}`;
    }
}

// expose functions
window.drillToCourse = drillToCourse;
window.drillToStudent = drillToStudent;
window.goHome = goHome;

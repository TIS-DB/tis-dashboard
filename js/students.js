let students = [];

const searchBox = document.getElementById("search");
const clearSearch = document.getElementById("clearSearch");
const studentPanel = document.getElementById("studentPanel");
const dashboardSummary = document.getElementById("dashboardSummary");
const updatedTime = document.getElementById("updatedTime");

document.addEventListener("DOMContentLoaded", loadStudents);

function loadStudents() {
  fetch("data/students.json?v=" + Date.now())
    .then(res => res.json())
    .then(data => {
      students = Array.isArray(data) ? data : [data];

      renderDashboardSummary();
      updateTime();

      /*if (searchBox.value.trim()) {
        renderStudentView(searchBox.value.trim());
      } else {
        studentPanel.innerHTML = `<div class="empty">Search a student to view details</div>`;
      }*/

      if (searchBox.value.trim()) {
  renderStudentView(searchBox.value.trim());
} else if (students.length > 0) {
  const firstStudentName = students[1].student_name || "";
  searchBox.value = firstStudentName;
  renderStudentView(firstStudentName);
} else {
  studentPanel.innerHTML = `<div class="empty">No student data found</div>`;
      }
    })
    .catch(err => {
      console.error("Error loading students.json", err);
      studentPanel.innerHTML = `<div class="empty">Unable to load students.json</div>`;
    });
}

function refreshStudents() {
  loadStudents();
}

searchBox.addEventListener("input", () => {
  renderStudentView(searchBox.value.trim());
});

/*clearSearch.addEventListener("click", () => {
  searchBox.value = "";
  studentPanel.innerHTML = `<div class="empty">Search a student to view details</div>`;
});*/

clearSearch.addEventListener("click", () => {
  searchBox.value = "";

  if (students.length > 0) {
    const firstStudentName = students[0].student_name || "";
    searchBox.value = firstStudentName;
    renderStudentView(firstStudentName);
  } else {
    studentPanel.innerHTML = `<div class="empty">No student data found</div>`;
  }
});

function renderDashboardSummary() {
  const fy27 = students.filter(r => r.financial_year === "FY27");
  const totalEnrollments = fy27.length;
  const totalRevenue = fy27.reduce((sum, r) => sum + num(r.course_fee), 0);

  dashboardSummary.innerText =
    `${totalEnrollments} enrolments · FY27`;
}

function updateTime() {
  const now = new Date();
  updatedTime.innerText =
    "Updated " +
    now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
}

function renderStudentView(searchText) {
  if (!searchText) {
    studentPanel.innerHTML = `<div class="empty">Search a student to view details</div>`;
    return;
  }

  const q = searchText.toLowerCase();

  const matched = students.filter(r =>
    String(r.student_name || "").toLowerCase().includes(q) ||
    String(r.contact_number || "").toLowerCase().includes(q) ||
    String(r.school || "").toLowerCase().includes(q)
  );

  if (!matched.length) {
    studentPanel.innerHTML = `<div class="empty">No matching student found</div>`;
    return;
  }

  const studentName = matched[0].student_name;

  const records = students
    .filter(r => String(r.student_name || "").toLowerCase() === studentName.toLowerCase())
    .sort((a, b) => parseDate(b.enrolled_date) - parseDate(a.enrolled_date));

  renderStudent(studentName, records);
}

function renderStudent(studentName, records) {
  const totalCourses = records.length;
  const totalFees = records.reduce((sum, r) => sum + num(r.course_fee), 0);
  const pendingHours = records.reduce((sum, r) => sum + num(r.attendance_pending_hours), 0);
  const completedHours = records.reduce((sum, r) => sum + num(r.attendance_completed_hours), 0);

  let html = `
    <div class="student-profile">
      <div class="avatar">${getInitials(studentName)}</div>
      <div>
        <h2>${studentName}</h2>
        <p>${totalCourses} course${totalCourses > 1 ? "s" : ""} enrolled</p>
      </div>
    </div>

  
  <div class="kpi-grid">

    <div class="kpi-card small">
        <h3>Courses</h3>
        <div class="big">${totalCourses}</div>
        <p>Enrolled</p>
    </div>

    <div class="kpi-card small">
        <h3>Total Fees</h3>
        <div class="big blue">${formatCurrency(totalFees)}</div>
    </div>

    <div class="kpi-card small">
        <h3>Pending Hours</h3>
        <div class="big">${formatHours(pendingHours)}</div>
        <p>${formatHours(completedHours)} completed</p>
    </div>

</div>

    <div class="student-section-title">
      <h2>COURSES — NEWEST FIRST</h2>
    </div>
  `;

  records.forEach((r, index) => {
    html += renderCourseCard(r, index === 0);
  });

  studentPanel.innerHTML = html;
}
function renderCourseCard(r, isLatest) {
  const scheduled = num(r.attendance_scheduled_hours);
  const completed = num(r.attendance_completed_hours);
  const pending = num(r.attendance_pending_hours);
  const completion = num(r.completion_percentage);

  return `
    <div class="course-card ${isLatest ? "latest" : ""}">
      <div class="course-top">
        <div class="course-name">${r.course_name || "-"}</div>
        <div class="course-fee">${formatCurrency(num(r.course_fee))}</div>
      </div>

      <div class="tags">
        ${isLatest ? `<span class="tag latest-tag">★ Latest</span>` : ""}
        <span class="tag center">${r.enrolment_center || "-"}</span>
        <span class="tag">${formatDate(r.enrolled_date)}</span>
        <span class="tag">${formatHours(num(r.course_duration_hours))} course</span>
      </div>

      <div class="att-row">
        <span>ATTENDANCE</span>
        <span>${Math.round(completion)}% complete</span>
      </div>

      <div class="progress">
        <div class="progress-bar" style="width:${Math.min(completion, 100)}%"></div>
      </div>

      <div class="hours-grid">
        <div>
          <div class="num">${formatHours(scheduled)}</div>
          <div class="txt">Scheduled</div>
        </div>
        <div>
          <div class="num completed">${formatHours(completed)}</div>
          <div class="txt">Completed</div>
        </div>
        <div>
          <div class="num pending">${formatHours(pending)}</div>
          <div class="txt">Pending</div>
        </div>
      </div>
    </div>
  `;
}

function num(v) {
  return Number(v || 0);
}

function formatHours(v) {
  return v % 1 === 0 ? `${v.toFixed(0)}h` : `${v.toFixed(2)}h`;
}

function formatCurrency(v) {
  if (v >= 10000000) return "₹" + (v / 10000000).toFixed(2) + " Cr";
  if (v >= 100000) return "₹" + (v / 100000).toFixed(2) + " L";
  return "₹" + v.toLocaleString("en-IN");
}

function getInitials(name) {
  return String(name || "")
    .split(" ")
    .map(w => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function parseDate(dateStr) {
  if (!dateStr) return new Date(0);

  const parts = String(dateStr).split("-");
  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };

  if (parts.length === 3 && months[parts[1]] !== undefined) {
    return new Date(parts[2], months[parts[1]], parts[0]);
  }

  return new Date(dateStr);
}

function formatDate(dateStr) {
  const d = parseDate(dateStr);
  if (isNaN(d)) return dateStr || "-";

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function goToFY27() {
  window.location.href = "index.html";
}

function goToFY26() {
  window.location.href = "index.html";
}

window.goToFY27 = goToFY27;
window.goToFY26 = goToFY26;
window.refreshStudents = refreshStudents;

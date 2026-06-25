let allData = [];

fetch("data/enrollments.json")
  .then(res => res.json())
  .then(data => {
    allData = data;
    renderTable(allData);
  });

function renderTable(data) {
  const container = document.getElementById("tableContainer");

  let html = `
    <table border="1" width="100%" cellspacing="0">
      <thead>
        <tr>
          <th>Student</th>
          <th>School</th>
          <th>Grade</th>
          <th>Course</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach(row => {
    html += `
      <tr>
        <td>${row.student_name || ""}</td>
        <td>${row.school || ""}</td>
        <td>${row.grade || ""}</td>
        <td>${row.course || ""}</td>
        <td>${row.status || ""}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

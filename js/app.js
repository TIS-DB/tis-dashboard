let rawData = [];

// --------------------
// LOAD DATA
// --------------------
fetch("./data/enrollments.json")
  .then(res => res.json())
  .then(data => {
    rawData = data;

    updateKPIs();
    renderCategories();
  })
  .catch(err => console.error("JSON Load Error:", err));


// --------------------
// KPI CALCULATION
// --------------------
function updateKPIs() {

  let totalRevenue = 0;
  let existingRevenue = 0;
  let newRevenue = 0;

  let total = rawData.length;
  let existingCount = 0;
  let newCount = 0;

  rawData.forEach(item => {

    let fee = Number((item.course_fee || 0).toString().replace(/,/g, ""));
    let type = (item.new_existing || "").toLowerCase();

    totalRevenue += fee;

    if (type === "existing") {
      existingRevenue += fee;
      existingCount++;
    } else if (type === "new") {
      newRevenue += fee;
      newCount++;
    }
  });

  let avgRevenue = total ? (totalRevenue / total) : 0;
  let newShare = total ? (newCount / total) * 100 : 0;

  document.getElementById("totalRevenue").innerText = "₹" + formatINR(totalRevenue);
  document.getElementById("existingRevenue").innerText = "₹" + formatINR(existingRevenue);
  document.getElementById("newRevenue").innerText = "₹" + formatINR(newRevenue);

  document.getElementById("totalStudents").innerText = total;
  document.getElementById("existingStudents").innerText = existingCount;
  document.getElementById("newStudents").innerText = newCount;

  document.getElementById("avgRevenue").innerText = "₹" + formatINR(avgRevenue);
  document.getElementById("newShare").innerText = newShare.toFixed(1) + "%";
}


// --------------------
// LEVEL 1: CATEGORY
// --------------------
function renderCategories() {

  document.getElementById("breadcrumb").innerHTML = "";

  const grouped = groupBy(rawData, "category");

  let rows = "";

  Object.keys(grouped).forEach(cat => {
    rows += `
      <tr>
        <td colspan="6" style="cursor:pointer;color:blue"
            onclick="openCategory('${cat}')">
            📂 ${cat} (${grouped[cat].length})
        </td>
      </tr>
    `;
  });

  document.getElementById("tableBody").innerHTML = rows;
}


// --------------------
// LEVEL 2: COURSE
// --------------------
function openCategory(category) {

  document.getElementById("breadcrumb").innerHTML =
    `<span onclick="renderCategories()" style="cursor:pointer;color:blue">Categories</span> → ${category}`;

  const filtered = rawData.filter(d => d.category === category);

  const grouped = groupBy(filtered, "course");

  let rows = "";

  Object.keys(grouped).forEach(course => {
    rows += `
      <tr>
        <td colspan="6" style="cursor:pointer;color:green"
            onclick="openCourse('${category}','${course}')">
            📘 ${course} (${grouped[course].length})
        </td>
      </tr>
    `;
  });

  document.getElementById("tableBody").innerHTML = rows;
}


// --------------------
// LEVEL 3: STUDENTS
// --------------------
function openCourse(category, course) {

  document.getElementById("breadcrumb").innerHTML =
    `<span onclick="renderCategories()" style="cursor:pointer;color:blue">Categories</span>
     → <span onclick="openCategory('${category}')" style="cursor:pointer;color:blue">${category}</span>
     → ${course}`;

  const filtered = rawData.filter(
    d => d.category === category && d.course === course
  );

  let rows = "";

  filtered.forEach(item => {

    let fee = Number((item.course_fee || 0).toString().replace(/,/g, ""));

    rows += `
      <tr>
        <td>${item.student_name || ""}</td>
        <td>${item.course || ""}</td>
        <td>${item.category || ""}</td>
        <td>${item.school || ""}</td>
        <td>${item.center || ""}</td>
        <td>${item.mentor || ""}</td>
        <td>${item.completion || 0}%</td>
      </tr>
    `;
  });

  document.getElementById("tableBody").innerHTML = rows;
}


// --------------------
// HELPERS
// --------------------
function groupBy(data, key) {
  return data.reduce((acc, item) => {
    const k = item[key] || "Unknown";
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}


// Format INR (K / L / Cr)
function formatINR(num) {
  num = Math.round(num);

  if (num >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
  if (num >= 100000) return (num / 100000).toFixed(2) + " L";
  if (num >= 1000) return (num / 1000).toFixed(1) + " K";

  return num;
}

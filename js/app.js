let rawData = [];

// --------------------
// SAFE KEY HELPER
// --------------------
function get(item, keys) {
  for (let k of keys) {
    if (item[k] !== undefined) return item[k];
  }
  return "";
}

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
// KPIs
// --------------------
function updateKPIs() {

  let totalRevenue = 0;
  let existingRevenue = 0;
  let newRevenue = 0;

  let total = rawData.length;
  let existingCount = 0;
  let newCount = 0;

  rawData.forEach(item => {

    let fee = Number((get(item, ["course_fee"]) || 0).toString().replace(/,/g, ""));
    let type = (get(item, ["new/existing"]) || "").toLowerCase();

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

  const grouped = {};

  rawData.forEach(item => {
    const cat = get(item, ["course_category", "category"]);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

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

  const filtered = rawData.filter(item =>
    get(item, ["course_category", "category"]) === category
  );

  const grouped = {};

  filtered.forEach(item => {
    const course = get(item, ["course_name", "course"]);
    if (!grouped[course]) grouped[course] = [];
    grouped[course].push(item);
  });

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

  const filtered = rawData.filter(item =>
    get(item, ["course_category", "category"]) === category &&
    get(item, ["course_name", "course"]) === course
  );

  let rows = "";

  filtered.forEach(item => {

    let fee = Number((get(item, ["course_fee"]) || 0).toString().replace(/,/g, ""));
    let type = get(item, ["new/existing"]);

    rows += `
      <tr>
        <td>${get(item, ["student_name"])}</td>
        <td>${get(item, ["course_name", "course"])}</td>
        <td>${get(item, ["course_category", "category"])}</td>
        <td>${type}</td>
        <td>${get(item, ["enrolment_date"])}</td>
        <td>₹${fee.toLocaleString()}</td>
      </tr>
    `;
  });

  document.getElementById("tableBody").innerHTML = rows;
}


// --------------------
// FORMATTER
// --------------------
function formatINR(num) {
  num = Math.round(num);

  if (num >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
  if (num >= 100000) return (num / 100000).toFixed(2) + " L";
  if (num >= 1000) return (num / 1000).toFixed(1) + " K";

  return num;
}

let rawData = [];

let selectedCategory = "";
let selectedCourse = "";

// Load data
fetch("./data/enrollments.json")
  .then(res => res.json())
  .then(data => {
    rawData = data;
    renderCategories();
  });


// --------------------
// LEVEL 1: CATEGORY
// --------------------
function renderCategories() {

  selectedCategory = "";
  selectedCourse = "";

  document.getElementById("breadcrumb").innerHTML = "";

  const grouped = groupBy(rawData, "course_category");

  let rows = "";

  Object.keys(grouped).forEach(cat => {
    rows += `
      <tr>
        <td colspan="5" style="cursor:pointer;color:blue"
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

  selectedCategory = category;

  document.getElementById("breadcrumb").innerHTML =
    `<span onclick="renderCategories()" style="cursor:pointer;color:blue">Categories</span> → ${category}`;

  const filtered = rawData.filter(d => d.course_category === category);

  const grouped = groupBy(filtered, "course_name");

  let rows = "";

  Object.keys(grouped).forEach(course => {
    rows += `
      <tr>
        <td colspan="5" style="cursor:pointer;color:green"
            onclick="openCourse('${course}')">
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
function openCourse(course) {

  selectedCourse = course;

  document.getElementById("breadcrumb").innerHTML =
    `<span onclick="renderCategories()" style="cursor:pointer;color:blue">Categories</span>
     → <span onclick="openCategory('${selectedCategory}')" style="cursor:pointer;color:blue">${selectedCategory}</span>
     → ${course}`;

  const filtered = rawData.filter(
    d =>
      d.course_category === selectedCategory &&
      d.course_name === course
  );

  let rows = "";

  filtered.forEach(item => {
    rows += `
      <tr>
        <td>${item.student_name || ""}</td>
        <td>${item.course_name || ""}</td>
        <td>${item.course_category || ""}</td>
        <td>${item.new_existing || ""}</td>
        <td>${item.enrolment_date || ""}</td>
        <td>₹${item.course_fee || 0}</td>
      </tr>
    `;
  });

  document.getElementById("tableBody").innerHTML = rows;
}


// --------------------
// HELPER
// --------------------
function groupBy(data, key) {
  return data.reduce((acc, item) => {
    const k = item[key] || "Unknown";
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

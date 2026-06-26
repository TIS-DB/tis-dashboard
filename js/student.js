let students = [];

const tableBody = document.getElementById("tableBody");
const headerRow = document.getElementById("headerRow");
const searchBox = document.getElementById("search");

// -----------------------------
// LOAD DATA
// -----------------------------
fetch("data/students.json")
    .then(res => res.json())
    .then(data => {
        students = data;
        renderTable(students);
    })
    .catch(err => {
        console.error("Error loading students.json", err);
    });

// -----------------------------
// RENDER TABLE
// -----------------------------
function renderTable(data) {
    if (!data || data.length === 0) return;

    tableBody.innerHTML = "";
    headerRow.innerHTML = "";

    // headers
    Object.keys(data[0]).forEach(key => {
        let th = document.createElement("th");
        th.innerText = key;
        headerRow.appendChild(th);
    });

    // rows
    data.forEach(row => {
        let tr = document.createElement("tr");

        Object.values(row).forEach(val => {
            let td = document.createElement("td");
            td.innerText = val;
            tr.appendChild(td);
        });

        tableBody.appendChild(tr);
    });
}

// -----------------------------
// SEARCH FILTER
// -----------------------------
searchBox.addEventListener("input", function () {
    let value = this.value.toLowerCase();

    let filtered = students.filter(student =>
        Object.values(student).some(v =>
            String(v).toLowerCase().includes(value)
        )
    );

    renderTable(filtered);
});
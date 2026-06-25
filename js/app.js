let allData = [];

fetch('data/enrollments.json')
.then(response => response.json())
.then(data => {

    allData = data;

    loadKPIs();
    loadTable(data);

});

let enrollments = [];

fetch("data/enrollments.json")
.then(response => response.json())
.then(data => {

    enrollments = data;

    updateDashboard(enrollments);

});



function updateDashboard(data){

    document.getElementById("totalStudents").innerHTML =
        data.length;


    let revenue = data.reduce((sum,item)=>{
        return sum + Number(item.revenue || 0);
    },0);


    document.getElementById("totalRevenue").innerHTML =
        "₹" + revenue.toLocaleString();


    let completion = data.reduce((sum,item)=>{
        return sum + Number(item.completion || 0);
    },0);


    let avg = data.length ? completion/data.length : 0;


    document.getElementById("avgCompletion").innerHTML =
        avg.toFixed(1)+"%";


    renderTable(data);

}



function renderTable(data){

let rows="";


data.forEach(item=>{

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

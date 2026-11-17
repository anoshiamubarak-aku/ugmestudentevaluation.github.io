
/*
 UGME STUDENT EVALUATION PORTAL
 LOCAL DEMONSTRATION ONLY
 Do not use real student or confidential data.
*/

const KEY = "ugme_demo_v1";

const defaults = {
  faculty: [
    {name:"Faculty Member A",department:"General Medicine"},
    {name:"Faculty Member B",department:"General Surgery"},
    {name:"Faculty Member C",department:"Family Medicine"}
  ],
  students:["Student A","Student B","Student C"],
  questions:[
    "Facilitates learning",
    "Provides useful feedback",
    "Engages students as part of the health care team",
    "Holds students accountable",
    "Demonstrates professionalism",
    "Is an effective role model",
    "Overall effectiveness as a teacher"
  ],
  assignments:[],
  responses:[],
  admins:[]
};

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(
  /[&<>"']/g,
  c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",
    '"':"&quot;","'":"&#39;"
  }[c])
);

let db;
try {
  db = JSON.parse(localStorage.getItem(KEY)) || {};
} catch {
  db = {};
}

for (const key of Object.keys(defaults)) {
  if (!Array.isArray(db[key])) {
    db[key] = structuredClone(defaults[key]);
  }
}

if (!db.studentDetails ||
    typeof db.studentDetails !== "object" ||
    Array.isArray(db.studentDetails)) {
  db.studentDetails = {};
}

const save = () => localStorage.setItem(KEY,JSON.stringify(db));
const years = ["Year 3","Year 4","Year 5"];
const meta = name => db.studentDetails[name] || {};
const card = html => `<section class="card">${html}</section>`;
const stat = (name,n) => card(
  `<div class="muted">${esc(name)}</div><div class="metric">${n}</div>`
);
const done = a => db.responses.some(r => r.assignmentId === a.id);
const back = `<button class="btn secondary" onclick="render('technical')">← Back to Technical Admin</button>`;

const table = (headers,rows) => `
<div style="overflow-x:auto">
<table>
<thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead>
<tbody>
${rows.length ? rows.map(r=>`
<tr>${r.map(v=>`<td>${v}</td>`).join("")}</tr>
`).join("") : `<tr><td colspan="${headers.length}">No records yet.</td></tr>`}
</tbody>
</table>
</div>`;

const yearOptions = selected => years.map(y =>
  `<option value="${y}" ${y===selected?"selected":""}>${y}</option>`
).join("");

const departments = () => [...new Set([
  ...db.faculty.map(f=>f.department),
  "General Medicine","General Surgery","Family Medicine",
  "Dermatology","Endocrinology","Pulmonology",
  "Emergency Medicine","Anaesthesia","Pediatrics"
])].sort();

const facultyMatches = (f,year,rotation) =>
  !f.mappings?.length ||
  f.mappings.some(m =>
    m.year===year &&
    m.rotation.toLowerCase()===rotation.toLowerCase()
  );

let selectedStudent = db.students[0] || "";
let selectedYear = "Year 3";

// CSV UTILITIES

function parseCSV(text) {
  const rows=[];
  let row=[],field="",quoted=false;
  text=text.replace(/^\uFEFF/,"");

  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quoted && text[i+1]==='"'){
        field+='"';i++;
      } else quoted=!quoted;
    } else if(c==="," && !quoted){
      row.push(field.trim());field="";
    } else if((c==="\n" || c==="\r") && !quoted){
      if(c==="\r" && text[i+1]==="\n")i++;
      row.push(field.trim());
      if(row.some(Boolean))rows.push(row);
      row=[];field="";
    } else field+=c;
  }
  if(quoted)throw Error("Unclosed quoted CSV value");
  row.push(field.trim());
  if(row.some(Boolean))rows.push(row);
  return rows;
}

function downloadCSV(filename,rows){
  const csv=rows.map(r=>r.map(v=>
    '"'+String(v??"").replace(/"/g,'""')+'"'
  ).join(",")).join("\r\n");

  const url=URL.createObjectURL(new Blob(
    ["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}
  ));
  const a=document.createElement("a");
  a.href=url;a.download=filename;
  document.body.appendChild(a);
  a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

// MAIN NAVIGATION

function render(page="student"){
  document.querySelectorAll(".nav").forEach(b=>
    b.classList.toggle("active",b.dataset.page===page)
  );

  const titles={
    student:"Student Dashboard",
    department:"Department Admin",
    technical:"UGME Technical Admin",
    students:"Student Management",
    admins:"Admin Management",
    faculty:"Faculty Directory",
    forms:"Form Builder",
    reports:"Evaluation Reports"
  };

  $("heading").textContent=titles[page]||"UGME Portal";
  $("subtitle").textContent=
    "UGME Student Evaluation Portal · Demonstration environment";

  // STUDENT PORTAL

  if(page==="student"){
    const assignments=db.assignments.filter(a=>
      a.student===selectedStudent && a.year===selectedYear
    );
    const completed=assignments.filter(done).length;

    $("content").innerHTML=`
      <div class="notice">
        Local demonstration only. Use fictional records.
      </div>
      ${card(`
        <div style="display:flex;gap:18px;flex-wrap:wrap">
          <div style="flex:1;min-width:180px">
            <label>Student</label>
            <select id="studentSelector">
              ${db.students.map(s=>`
                <option value="${esc(s)}"
                  ${s===selectedStudent?"selected":""}>
                  ${esc(s)}
                </option>
              `).join("")}
            </select>
          </div>
          <div style="flex:1;min-width:180px">
            <label>Academic Year</label>
            <select id="yearSelector">
              ${yearOptions(selectedYear)}
            </select>
          </div>
        </div>
      `)}
      <div class="grid">
        ${stat("Assigned",assignments.length)}
        ${stat("Completed",completed)}
        ${stat("Pending",assignments.length-completed)}
      </div>
      <h2>My Evaluations</h2>
      ${assignments.length ? assignments.map(a=>card(`
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
          <div>
            <strong>Faculty Evaluation by Student</strong>
            <p class="muted">
              ${esc(a.rotation)} · ${esc(a.faculty)}
            </p>
          </div>
          ${done(a)
            ? `<span class="tag">Completed</span>`
            : `<button class="btn" data-evaluate="${esc(a.id)}">Start Evaluation</button>`
          }
        </div>
      `)).join("") : card(`
        <p class="muted">No evaluations assigned yet.</p>
      `)}
    `;

    $("studentSelector").onchange=e=>{
      selectedStudent=e.target.value;render("student");
    };
    $("yearSelector").onchange=e=>{
      selectedYear=e.target.value;render("student");
    };
    document.querySelectorAll("[data-evaluate]").forEach(b=>{
      b.onclick=()=>openEvaluation(b.dataset.evaluate);
    });
  }

  // UGME TECHNICAL ADMIN

  if(page==="technical"){
    $("content").innerHTML=`
      <div class="grid">
        ${stat("Students",db.students.length)}
        ${stat("Faculty",db.faculty.length)}
        ${stat("Assigned",db.assignments.length)}
        ${stat("Completed",db.assignments.filter(done).length)}
      </div>
      ${card(`
        <h2>UGME Management Tools</h2>
        <p class="muted">
          Prototype administration tools. No real access control.
        </p>
        <div class="management-grid">
          <button class="tool-card" onclick="render('forms')">📝 Form Builder</button>
          <button class="tool-card" onclick="render('faculty')">👩‍🏫 Faculty Directory</button>
          <button class="tool-card" onclick="render('department')">📋 Evaluation Assignments</button>
          <button class="tool-card" onclick="render('reports')">📊 Evaluation Reports</button>
          <button class="tool-card" onclick="render('students')">🎓 Student Management</button>
          <button class="tool-card" onclick="render('admins')">🔐 Admin Management</button>
        </div>
      `)}
      ${card(`
        <h2>Evaluation Types</h2>
        <p>Faculty Evaluation by Student · End of Rotation Evaluation · Evaluation of Teaching Activity · CBIL Evaluation</p>
        <p class="muted">Only the faculty evaluation questionnaire is implemented in this prototype.</p>
      `)}
    `;
  }

  // STUDENT MANAGEMENT

  if(page==="students"){
    $("content").innerHTML=`
      ${back}
      ${card(`
        <h2>Student Management</h2>
        <form id="studentForm">
          <label>Student Name</label>
          <input name="name" required placeholder="Demo Student D">
          <label>Student ID</label>
          <input name="id" required placeholder="DEMO004">
          <label>Email</label>
          <input name="email" type="email" required placeholder="demo@example.org">
          <label>Academic Year</label>
          <select name="year">${yearOptions("Year 3")}</select>
          <label>Student Group</label>
          <input name="group" placeholder="e.g. A">
          <label>Subgroup</label>
          <input name="subgroup" placeholder="e.g. A1">
          <button class="btn">Add Student</button>
        </form>
      `)}
      ${card(`
        <h2>Import Students from Excel</h2>
        <p class="muted">Save the Excel sheet as CSV UTF-8. Columns: Name, Student ID, Email, Academic Year.</p>
        <button class="btn secondary" id="templateButton">Download CSV Template</button>
        <label>Choose CSV File</label>
        <input type="file" id="studentCSV" accept=".csv,text/csv">
        <button class="btn" id="importStudents">Import CSV</button>
      `)}
      ${card(`
        <h2>Student Directory (${db.students.length})</h2>
        ${table(
          ["Name","Student ID","Email","Year","Group","Subgroup","Action"],
          db.students.map((s,i)=>[
            esc(s),esc(meta(s).id||"—"),
            esc(meta(s).email||"—"),
            esc(meta(s).year||"Not assigned"),
            esc(meta(s).group||"—"),
            esc(meta(s).subgroup||"—"),
            `<button class="btn secondary" data-remove-student="${i}">Remove</button>`
          ])
        )}
      `)}
    `;

    $("studentForm").onsubmit=e=>{
      e.preventDefault();
      const d=new FormData(e.target);
      const name=String(d.get("name")).trim();
      const id=String(d.get("id")).trim();
      const email=String(d.get("email")).trim().toLowerCase();

      if(db.students.some(s=>s.toLowerCase()===name.toLowerCase()) ||
        Object.values(db.studentDetails).some(m=>
          m.id===id || m.email===email)){
        alert("Student name, ID or email already exists.");
        return;
      }

      db.students.push(name);
      db.studentDetails[name]={
        id,email,
        year:d.get("year"),
        group:String(d.get("group")||"").trim(),
        subgroup:String(d.get("subgroup")||"").trim()
      };
      save();render("students");
    };

    $("templateButton").onclick=()=>downloadCSV(
      "student-template.csv",
      [
        ["Name","Student ID","Email","Academic Year"],
        ["Demo Student D","DEMO004","demo@example.org","Year 3"]
      ]
    );

    $("importStudents").onclick=async()=>{
      const file=$("studentCSV").files[0];
      if(!file)return alert("Choose a CSV file.");

      try{
        const rows=parseCSV(await file.text());
        const expected=["name","student id","email","academic year"];
        if(!rows.length ||
          rows[0].map(x=>x.toLowerCase()).join("|")!==expected.join("|")){
          throw Error("Incorrect CSV column headings.");
        }

        const staged=[];
        const names=new Set(db.students.map(s=>s.toLowerCase()));
        const ids=new Set(Object.values(db.studentDetails).map(m=>m.id));
        const emails=new Set(Object.values(db.studentDetails).map(m=>m.email));

        for(const [i,row] of rows.slice(1).entries()){
          if(row.length!==4)throw Error(`Row ${i+2}: expected four columns.`);
          const [name,id,emailRaw,year]=row.map(x=>x.trim());
          const email=emailRaw.toLowerCase();

          if(!name || !id || !years.includes(year) ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
            throw Error(`Row ${i+2}: invalid information.`);
          }
          if(names.has(name.toLowerCase()) || ids.has(id) || emails.has(email)){
            throw Error(`Row ${i+2}: duplicate student.`);
          }
          names.add(name.toLowerCase());ids.add(id);emails.add(email);
          staged.push({name,id,email,year});
        }

        staged.forEach(s=>{
          db.students.push(s.name);
          db.studentDetails[s.name]={
            id:s.id,email:s.email,year:s.year,group:"",subgroup:""
          };
        });
        save();alert(`${staged.length} students imported.`);
        render("students");
      }catch(err){
        alert("Import failed: "+err.message);
      }
    };

    document.querySelectorAll("[data-remove-student]").forEach(b=>{
      b.onclick=()=>{
        const i=Number(b.dataset.removeStudent);
        const name=db.students[i];
        if(db.assignments.some(a=>a.student===name)){
          alert("Student has assignments and cannot be removed.");
          return;
        }
        if(confirm("Remove this sample student?")){
          db.students.splice(i,1);
          delete db.studentDetails[name];
          if(selectedStudent===name)selectedStudent=db.students[0]||"";
          save();render("students");
        }
      };
    });
  }

  // ADMIN MANAGEMENT

  if(page==="admins"){
    $("content").innerHTML=`
      ${back}
      ${card(`
        <h2>Admin Management</h2>
        <p class="muted">Demo records only. This does not create logins or enforce access permissions.</p>
        <form id="adminForm">
          <label>Admin Name</label>
          <input name="name" required>
          <label>Email</label>
          <input name="email" type="email" required>
          <label>Department</label>
          <select name="department">
            ${departments().map(d=>`<option>${esc(d)}</option>`).join("")}
          </select>
          <label>Role</label>
          <select name="role">
            <option>Department Admin</option>
            <option>UGME Technical Admin</option>
          </select>
          <button class="btn">Add Admin</button>
        </form>
      `)}
      ${card(`
        <h2>Admin Directory</h2>
        ${table(["Name","Email","Department","Role","Action"],
          db.admins.map((a,i)=>[
            esc(a.name),esc(a.email),esc(a.department),esc(a.role),
            `<button class="btn secondary" data-remove-admin="${i}">Remove</button>`
          ])
        )}
      `)}
    `;

    $("adminForm").onsubmit=e=>{
      e.preventDefault();
      const d=new FormData(e.target);
      const email=String(d.get("email")).trim().toLowerCase();
      if(db.admins.some(a=>a.email===email)){
        alert("Admin email already exists.");return;
      }
      db.admins.push({
        id:crypto.randomUUID(),
        name:String(d.get("name")).trim(),
        email,
        department:d.get("department"),
        role:d.get("role")
      });
      save();render("admins");
    };

    document.querySelectorAll("[data-remove-admin]").forEach(b=>{
      b.onclick=()=>{
        if(confirm("Remove this demo admin?")){
          db.admins.splice(Number(b.dataset.removeAdmin),1);
          save();render("admins");
        }
      };
    });
  }

  // FACULTY DIRECTORY

  if(page==="faculty"){
    $("content").innerHTML=`
      ${back}
      ${card(`
        <h2>Faculty Directory</h2>
        <p class="muted">A faculty member can be linked to multiple years and rotations.</p>
        <form id="facultyForm">
          <label>Faculty Name</label>
          <input name="name" required>
          <label>Department</label>
          <input name="department" required>
          <label>Academic Year</label>
          <select name="year">${yearOptions("Year 3")}</select>
          <label>Rotation</label>
          <input name="rotation" required placeholder="General Medicine">
          <button class="btn">Add Faculty / Rotation</button>
        </form>
      `)}
      ${card(`
        <h2>Faculty Members</h2>
        ${table(["Name","Department","Year / Rotation","Action"],
          db.faculty.map((f,i)=>[
            esc(f.name),esc(f.department),
            f.mappings?.length
              ? f.mappings.map(m=>`${esc(m.year)} — ${esc(m.rotation)}`).join("<br>")
              : "Not mapped (available for all)",
            `<button class="btn secondary" data-remove-faculty="${i}">Remove</button>`
          ])
        )}
      `)}
    `;

    $("facultyForm").onsubmit=e=>{
      e.preventDefault();
      const d=new FormData(e.target);
      const name=String(d.get("name")).trim();
      const department=String(d.get("department")).trim();
      const year=String(d.get("year"));
      const rotation=String(d.get("rotation")).trim();

      let f=db.faculty.find(x=>
        x.name.toLowerCase()===name.toLowerCase() &&
        x.department.toLowerCase()===department.toLowerCase()
      );
      if(!f){
        f={name,department,mappings:[]};
        db.faculty.push(f);
      }
      if(!f.mappings)f.mappings=[];
      if(f.mappings.some(m=>
        m.year===year &&
        m.rotation.toLowerCase()===rotation.toLowerCase())){
        alert("This faculty mapping already exists.");return;
      }
      f.mappings.push({year,rotation});
      save();render("faculty");
    };

    document.querySelectorAll("[data-remove-faculty]").forEach(b=>{
      b.onclick=()=>{
        const i=Number(b.dataset.removeFaculty);
        const f=db.faculty[i];
        if(db.assignments.some(a=>a.faculty===f.name)){
          alert("This faculty member has assignments.");return;
        }
        if(confirm("Remove this faculty member?")){
          db.faculty.splice(i,1);
          save();render("faculty");
        }
      };
    });
  }

  // DEPARTMENT ADMIN — BULK ASSIGNMENT

  if(page==="department"){
    $("content").innerHTML=`
      ${card(`
        <h2>Assign Evaluations</h2>
        <p class="muted">Select a rotation, faculty and students. Bulk assignment is supported.</p>

        <form id="assignForm">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px">
            <div>
              <label>Academic Year</label>
              <select id="assignYear" name="year">${yearOptions("Year 3")}</select>
            </div>
            <div>
              <label>Rotation Number</label>
              <input name="rotationNo" type="number" min="1" placeholder="1">
            </div>
            <div>
              <label>Student Group</label>
              <select id="assignGroup" name="group">
                <option value="">All groups</option>
              </select>
            </div>
            <div>
              <label>Subgroup</label>
              <select id="assignSubgroup" name="subgroup">
                <option value="">All subgroups</option>
              </select>
            </div>
            <div>
              <label>Rotation</label>
              <input id="assignRotation" name="rotation"
                list="rotationSuggestions" required
                placeholder="General Medicine">
            </div>
            <div>
              <label>Faculty</label>
              <select id="assignFaculty" name="facultyIndex" required></select>
            </div>
            <div>
              <label>Rotation Start Date</label>
              <input name="startDate" type="date">
            </div>
            <div>
              <label>Rotation End Date</label>
              <input name="endDate" type="date">
            </div>
          </div>

          <datalist id="rotationSuggestions">
            ${[...new Set(db.faculty.flatMap(f=>[
              f.department,...(f.mappings||[]).map(m=>m.rotation)
            ]))].map(r=>`<option value="${esc(r)}"></option>`).join("")}
          </datalist>

          <h3>Select Students</h3>
          <label>Search by Student Name or ID</label>
          <input id="assignSearch" placeholder="Search students">

          <p>
            <label style="display:inline-flex;gap:8px;align-items:center">
              <input type="checkbox" id="selectAllStudents" style="width:auto">
              Select All Displayed Students
            </label>
          </p>

          <div id="studentChoices"
            style="max-height:240px;overflow:auto;border:1px solid #dce8e4;padding:12px;border-radius:10px">
          </div>

          <p><strong>Selected Student(s): <span id="selectedCount">0</span></strong></p>

          <button class="btn" type="submit">
            Assign Evaluations to Selected Students
          </button>
        </form>
      `)}

      ${card(`
        <h2>Assignment Completion Status</h2>
        <p class="muted">Only completion status is shown here, not evaluation responses.</p>
        ${table(
          ["Student","Year","Rotation No","Group","Subgroup","Rotation","Faculty","Dates","Status"],
          db.assignments.map(a=>[
            esc(a.student),esc(a.year),esc(a.rotationNo||"—"),
            esc(a.group||"—"),esc(a.subgroup||"—"),
            esc(a.rotation),esc(a.faculty),
            esc([a.startDate,a.endDate].filter(Boolean).join(" to ")||"—"),
            done(a)?"Completed":"Pending"
          ])
        )}
      `)}
    `;

    const selected=new Set();

    const eligible=()=>db.students.filter(name=>{
      const m=meta(name);
      const year=$("assignYear").value;
      const group=$("assignGroup").value;
      const subgroup=$("assignSubgroup").value;
      const search=$("assignSearch").value.trim().toLowerCase();

      return (!m.year || m.year===year) &&
        (!group || m.group===group) &&
        (!subgroup || m.subgroup===subgroup) &&
        (!search ||
          name.toLowerCase().includes(search) ||
          String(m.id||"").toLowerCase().includes(search));
    });

    function updateFilters(){
      const year=$("assignYear").value;
      const students=db.students.filter(n=>
        !meta(n).year || meta(n).year===year
      );

      const oldGroup=$("assignGroup").value;
      const groups=[...new Set(students.map(n=>meta(n).group).filter(Boolean))];
      $("assignGroup").innerHTML=
        `<option value="">All groups</option>`+
        groups.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join("");
      if(groups.includes(oldGroup))$("assignGroup").value=oldGroup;

      const oldSub=$("assignSubgroup").value;
      const group=$("assignGroup").value;
      const subs=[...new Set(students.filter(n=>
        !group || meta(n).group===group
      ).map(n=>meta(n).subgroup).filter(Boolean))];

      $("assignSubgroup").innerHTML=
        `<option value="">All subgroups</option>`+
        subs.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("");
      if(subs.includes(oldSub))$("assignSubgroup").value=oldSub;
    }

    function updateFaculty(){
      const year=$("assignYear").value;
      const rotation=$("assignRotation").value.trim();
      const available=db.faculty
        .map((f,i)=>({f,i}))
        .filter(x=>!rotation || facultyMatches(x.f,year,rotation));

      $("assignFaculty").innerHTML=
        `<option value="">Select Faculty</option>`+
        available.map(x=>`
          <option value="${x.i}">
            ${esc(x.f.name)} (${esc(x.f.department)})
          </option>
        `).join("");
    }

    function showStudents(){
      const names=eligible();
      $("studentChoices").innerHTML=names.length
        ? names.map(name=>`
          <label style="display:flex;align-items:center;gap:10px;padding:8px">
            <input type="checkbox" class="studentCheck"
              style="width:auto" value="${esc(name)}"
              ${selected.has(name)?"checked":""}>
            <span>${esc(name)} — ${esc(meta(name).id||"No sample ID")}</span>
          </label>
        `).join("")
        : `<p class="muted">No students match these filters.</p>`;

      document.querySelectorAll(".studentCheck").forEach(b=>{
        b.onchange=()=>{
          if(b.checked)selected.add(b.value);
          else selected.delete(b.value);
          $("selectedCount").textContent=selected.size;
          updateSelectAll();
        };
      });
      updateSelectAll();
      $("selectedCount").textContent=selected.size;
    }

    function updateSelectAll(){
      const names=eligible();
      $("selectAllStudents").checked=
        names.length>0 && names.every(n=>selected.has(n));
    }

    $("assignYear").onchange=()=>{
      selected.clear();
      updateFilters();updateFaculty();showStudents();
    };
    $("assignGroup").onchange=()=>{
      selected.clear();
      updateFilters();showStudents();
    };
    $("assignSubgroup").onchange=()=>{
      selected.clear();showStudents();
    };
    $("assignSearch").oninput=showStudents;
    $("assignRotation").oninput=updateFaculty;

    $("selectAllStudents").onchange=e=>{
      eligible().forEach(n=>{
        if(e.target.checked)selected.add(n);
        else selected.delete(n);
      });
      showStudents();
    };

    $("assignForm").onsubmit=e=>{
      e.preventDefault();
      const d=new FormData(e.target);
      const faculty=db.faculty[Number(d.get("facultyIndex"))];
      const rotation=String(d.get("rotation")).trim();
      const year=String(d.get("year"));
      const startDate=String(d.get("startDate")||"");
      const endDate=String(d.get("endDate")||"");

      if(!faculty || !facultyMatches(faculty,year,rotation)){
        alert("Select a faculty member mapped to this year and rotation.");
        return;
      }
      if(!selected.size){
        alert("Please select at least one student.");return;
      }
      if(startDate && endDate && endDate<startDate){
        alert("End date cannot be earlier than start date.");return;
      }

      let added=0;
      for(const student of selected){
        const duplicate=db.assignments.some(a=>
          a.student===student &&
          a.year===year &&
          a.faculty===faculty.name &&
          a.rotation.toLowerCase()===rotation.toLowerCase() &&
          String(a.rotationNo||"")===String(d.get("rotationNo")||"")
        );
        if(duplicate)continue;

        db.assignments.push({
          id:crypto.randomUUID(),
          student,year,
          rotationNo:String(d.get("rotationNo")||""),
          group:meta(student).group||String(d.get("group")||""),
          subgroup:meta(student).subgroup||String(d.get("subgroup")||""),
          rotation,
          faculty:faculty.name,
          startDate,endDate
        });
        added++;
      }

      save();
      alert(`${added} new evaluations assigned. Duplicate assignments were skipped.`);
      render("department");
    };

    updateFilters();
    updateFaculty();
    showStudents();
  }

  // FORM BUILDER

  if(page==="forms"){
    $("content").innerHTML=`
      ${back}
      ${card(`
        <h2>Faculty Evaluation Questions</h2>
        <form id="questionForm">
          <label>New Question</label>
          <input name="question" required>
          <button class="btn">Add Question</button>
        </form>
      `)}
      ${card(`
        <h2>Current Questions</h2>
        ${table(["#","Question","Action"],
          db.questions.map((q,i)=>[
            i+1,esc(q),
            `<button class="btn secondary" data-remove-question="${i}">Remove</button>`
          ])
        )}
      `)}
    `;

    $("questionForm").onsubmit=e=>{
      e.preventDefault();
      const q=String(new FormData(e.target).get("question")).trim();
      if(q){db.questions.push(q);save();render("forms");}
    };
    document.querySelectorAll("[data-remove-question]").forEach(b=>{
      b.onclick=()=>{
        if(confirm("Remove this demo question?")){
          db.questions.splice(Number(b.dataset.removeQuestion),1);
          save();render("forms");
        }
      };
    });
  }

  // REPORTS

  if(page==="reports"){
    $("content").innerHTML=`
      ${back}
      ${card(`
        <h2>Evaluation Reports</h2>
        <p class="muted">Demo reports only. This page has no secure access controls.</p>
        <button class="btn" id="exportButton">Export CSV</button>
        ${table(["Student","Faculty","Rotation","Ratings","Comments"],
          db.responses.map(r=>[
            esc(r.student),esc(r.faculty),esc(r.rotation),
            esc((r.ratings||[]).join(", ")),esc(r.comments)
          ])
        )}
      `)}
    `;
    $("exportButton").onclick=exportCSV;
  }
}

// EVALUATION QUESTIONNAIRE

function openEvaluation(id){
  const a=db.assignments.find(x=>x.id===id);
  if(!a)return alert("Assignment not found.");
  if(done(a))return alert("Evaluation already submitted.");

  $("heading").textContent="Faculty Evaluation by Student";
  $("subtitle").textContent=`${a.year} · ${a.rotation}`;

  $("content").innerHTML=card(`
    <button class="btn secondary" onclick="render('student')">
      ← Back to Student Dashboard
    </button>
    <h2>${esc(a.faculty)}</h2>
    <p class="muted">${esc(a.student)} · ${esc(a.rotation)}</p>

    <form id="evaluationForm">
      ${db.questions.map((q,i)=>`
        <div style="margin:18px 0">
          <label>${i+1}. ${esc(q)}</label>
          <select name="q${i}" required>
            <option value="">Select rating</option>
            ${["Poor","Fair","Good","Very Good","Excellent"].map(
              (label,j)=>`<option value="${j+2}">${j+2} – ${label}</option>`
            ).join("")}
          </select>
        </div>
      `).join("")}

      <label>Comments (optional)</label>
      <textarea name="comments"></textarea>
      <button class="btn">Submit Evaluation</button>
    </form>
  `);

  const snapshot=[...db.questions];

  $("evaluationForm").onsubmit=e=>{
    e.preventDefault();
    if(done(a))return alert("Already submitted.");

    const d=new FormData(e.target);
    db.responses.push({
      assignmentId:a.id,
      student:a.student,
      faculty:a.faculty,
      rotation:a.rotation,
      year:a.year,
      questions:snapshot,
      ratings:snapshot.map((_,i)=>Number(d.get("q"+i))),
      comments:String(d.get("comments")||""),
      date:new Date().toISOString()
    });
    save();
    alert("Demo evaluation submitted.");
    render("student");
  };
}

function exportCSV(){
  downloadCSV("ugme-demo-report.csv",[
    ["Student","Academic Year","Faculty","Rotation","Ratings","Comments","Submitted At"],
    ...db.responses.map(r=>[
      r.student,r.year||"",r.faculty,r.rotation,
      (r.ratings||[]).join("|"),r.comments,r.date
    ])
  ]);
}

// START WEBSITE

document.querySelectorAll(".nav").forEach(button=>{
  button.addEventListener("click",()=>render(button.dataset.page));
});

render("student");

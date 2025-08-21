
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const byId = id => document.getElementById(id);
const state = { exp:[], edu:[], proj:[] };

const fields = ["name","title","email","phone","location","website","summary","skills","tpl","accent"];
fields.forEach(id=>{
  const el = byId(id);
  el && el.addEventListener("input", render);
});

const yearEl = document.querySelector("#year,[data-year]");
if(yearEl){ yearEl.textContent = new Date().getFullYear(); }

function addRepeater(listId, tplId){
  const list = byId(listId);
  const tpl = byId(tplId).content.cloneNode(true);
  list.appendChild(tpl);
  list.dispatchEvent(new Event("change"));
  render();
}
function collectRepeater(listId){
  const rows = [];
  $$("#"+listId+" .item").forEach(item=>{
    const vals = $$("input,textarea", item).map(i=>i.value.trim());
    rows.push(vals);
  });
  return rows;
}
function bindRepeater(listId){
  const list = byId(listId);
  list.addEventListener("click", e=>{
    if(e.target.classList.contains("remove")){
      e.target.closest(".item").remove();
      render();
    }
  });
  list.addEventListener("input", render);
}
bindRepeater("expList");
bindRepeater("eduList");
bindRepeater("projList");

byId("addExp").onclick = ()=>addRepeater("expList","expTpl");
byId("addEdu").onclick = ()=>addRepeater("eduList","eduTpl");
byId("addProj").onclick = ()=>addRepeater("projList","projTpl");

["addExp","addEdu","addProj"].forEach(id=>byId(id).click());

byId("btnSave").onclick = ()=>{
  const data = gather();
  localStorage.setItem("resumeData", JSON.stringify(data));
  alert("Saved to your browser ✅");
};
byId("btnLoad").onclick = ()=>{
  const data = JSON.parse(localStorage.getItem("resumeData")||"null");
  if(!data){ alert("No saved data found."); return; }
  apply(data);
  render();
};
byId("btnClear").onclick = ()=>{
  if(confirm("Clear all fields?")){
    localStorage.removeItem("resumeData");
    location.reload();
  }
};

byId("btnPrint").onclick = ()=>window.print();

$$(".tab").forEach(t=>{
  t.onclick = ()=>{
    $$(".tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    const tab = t.dataset.tab;
    $("#resume").classList.toggle("hidden", tab!=="resume");
    $("#letter").classList.toggle("hidden", tab!=="letter");
  };
});

function gather(){
  const data = {};
  fields.forEach(id=>data[id]=byId(id).value.trim());
  data.exp = collectRepeater("expList");
  data.edu = collectRepeater("eduList");
  data.proj = collectRepeater("projList");
  data.coverLetter = $("#clOut").textContent;
  data.api = {
    base: byId("apiBase").value.trim(),
    key: byId("apiKey").value.trim(),
    model: byId("apiModel").value.trim()
  };
  data.cl = {
    role: byId("clRole").value.trim(),
    company: byId("clCompany").value.trim(),
    jd: byId("clJD").value.trim(),
  };
  return data;
}
function apply(data){
  Object.entries(data).forEach(([k,v])=>{
    if(fields.includes(k)) byId(k).value = v;
  });
  ["expList","eduList","projList"].forEach(id=>byId(id).innerHTML = "");
  (data.exp||[]).forEach(r=>{ addRepeater("expList","expTpl"); fillLast("expList", r); });
  (data.edu||[]).forEach(r=>{ addRepeater("eduList","eduTpl"); fillLast("eduList", r); });
  (data.proj||[]).forEach(r=>{ addRepeater("projList","projTpl"); fillLast("projList", r); });
  if(data.cl){
    byId("clRole").value = data.cl.role||"";
    byId("clCompany").value = data.cl.company||"";
    byId("clJD").value = data.cl.jd||"";
  }
  if(data.api){
    byId("apiBase").value = data.api.base||"";
    byId("apiKey").value = data.api.key||"";
    byId("apiModel").value = data.api.model||"gpt-4o-mini";
  }
  $("#clOut").textContent = data.coverLetter||"";
}
function fillLast(listId, values){
  const last = $$("#"+listId+" .item").slice(-1)[0];
  $$("input,textarea", last).forEach((el, i)=> el.value = (values[i]||""));
}

function render(){
  const d = gather();
  document.documentElement.style.setProperty("--accent", d.accent || "#5b7fff");
  const skills = (d.skills||"").split(",").map(s=>s.trim()).filter(Boolean);
  const sections = {
    header: `
      <div class="resume-header">
        <div>
          <div class="resume-name">${esc(d.name)||"Your Name"}</div>
          <div class="resume-title">${esc(d.title)||"Job Title"}</div>
        </div>
        <div class="resume-contact">
          <div>${esc(d.email)||""}</div>
          <div>${esc(d.phone)||""}</div>
          <div>${esc(d.location)||""}</div>
          <div>${esc(d.website)||""}</div>
        </div>
      </div>
      ${d.summary? `<p>${esc(d.summary)}</p>`:""}
    `,
    skills: skills.length? `
      <div class="section"><h4>Skills</h4>
        <div class="badges">${skills.map(s=>`<span class="badge">${esc(s)}</span>`).join("")}</div>
      </div>`:"",
    exp: buildExp(d.exp),
    edu: buildEdu(d.edu),
    proj: buildProj(d.proj),
  };
  const template = d.tpl || "clean";
  let html = "";
  if(template==="clean"){
    html = sections.header + sections.skills + sections.exp + sections.proj + sections.edu;
  } else if(template==="bold"){
    html = `
      <div class="left-rail">
        <aside class="rail">
          <h4>Skills</h4>${sections.skills || "<p>—</p>"}
          <h4>Education</h4>${sections.edu || "<p>—</p>"}
        </aside>
        <div>
          ${sections.header}
          ${sections.exp}
          ${sections.proj}
        </div>
      </div>`;
  } else {
    html = sections.header +
      `<div class="left-rail" style="grid-template-columns:1fr 1fr">
        <div>${sections.exp}${sections.proj}</div>
        <aside>${sections.skills}${sections.edu}</aside>
      </div>`;
  }
  $("#resume").innerHTML = html;
}
function buildExp(rows){
  if(!rows || !rows.length) return "";
  return `<div class="section"><h4>Experience</h4>${
    rows.map(r=>{
      const [role,company,start,end,bul] = r;
      const bullets = (bul||"").split("\\n").filter(x=>x.trim()).map(b=>`<li>${esc(b.replace(/^•\\s*/,""))}</li>`).join("");
      return `<div class="exp">
        <div class="role">${esc(role||"Role")} — ${esc(company||"Company")}</div>
        <div class="meta">${esc(start||"")} – ${esc(end||"")}</div>
        ${bullets? `<ul class="bullets">${bullets}</ul>`:""}
      </div>`;
    }).join("")
  }</div>`;
}
function buildEdu(rows){
  if(!rows || !rows.length) return "";
  return `<div class="section"><h4>Education</h4>${
    rows.map(r=>{
      const [deg,inst,start,end,hl] = r;
      return `<div class="exp">
        <div class="role">${esc(deg||"Degree")} — ${esc(inst||"Institute")}</div>
        <div class="meta">${esc(start||"")} – ${esc(end||"")}</div>
        ${hl? `<div>${esc(hl)}</div>`:""}
      </div>`;
    }).join("")
  }</div>`;
}
function buildProj(rows){
  if(!rows || !rows.length) return "";
  return `<div class="section"><h4>Projects</h4>${
    rows.map(r=>{
      const [title,desc,link] = r;
      return `<div class="exp">
        <div class="role">${esc(title||"Project")}</div>
        ${desc? `<div>${esc(desc)}</div>`:""}
        ${link? `<div class="meta">${linkify(esc(link))}</div>`:""}
      </div>`;
    }).join("")
  }</div>`;
}
function esc(s){ return (s||"").replace(/[&<>\"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])) }
function linkify(s){ try{ const u=new URL(s); return `<a href="${u.href}" target="_blank" rel="noopener">${u.hostname}</a>` }catch{ return s } }

byId("genCL").onclick = async ()=>{
  const d = gather();
  const prompt = makeCLPrompt(d);
  const hasApi = d.api.key && (d.api.base||"https://api.openai.com/v1");
  $("#clOut").textContent = "Generating cover letter...";
  document.querySelector(".tab[data-tab='letter']").click();
  try{
    if(hasApi){
      const text = await callOpenAICompat(d.api.base||"https://api.openai.com/v1", d.api.key, d.api.model||"gpt-4o-mini", prompt);
      $("#clOut").textContent = text.trim();
    } else {
      $("#clOut").textContent = localCoverLetter(d).trim();
    }
  }catch(err){
    $("#clOut").textContent = "Error generating letter. Using offline draft.\\n\\n" + localCoverLetter(d);
  }
  const data = gather(); localStorage.setItem("resumeData", JSON.stringify(data));
};
byId("copyCL").onclick = async ()=>{
  const t = $("#clOut").textContent.trim();
  if(!t){ alert("No cover letter to copy."); return; }
  await navigator.clipboard.writeText(t);
  alert("Cover letter copied ✅");
};
function makeCLPrompt(d){
  return `Write a concise, confident cover letter (200–280 words).
Candidate: ${d.name}, ${d.title}
Location: ${d.location}. Contacts: ${d.email}, ${d.phone}
Skills: ${(d.skills||"").trim()}
Recent project highlights: ${(d.proj||[]).map(p=>p[0]).filter(Boolean).join(", ")}

Role: ${d.cl.role} at ${d.cl.company}
Job description keywords: ${d.cl.jd}

Tone: positive, specific, ATS-friendly; avoid clichés; use 2 short paragraphs + a 3-bullet impact list + a crisp closing.`;
}
async function callOpenAICompat(base, key, model, prompt){
  const res = await fetch(`${base.replace(/\\/$/,"")}/chat/completions`,{
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${key}` },
    body: JSON.stringify({ model, messages:[{role:"user", content:prompt}], temperature:0.5 })
  });
  if(!res.ok) throw new Error("API error");
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}
function localCoverLetter(d){
  const name = d.name||"Your Name";
  const role = d.cl.role || "Frontend Developer";
  const company = d.cl.company || "the company";
  const skills = (d.skills||"HTML, CSS, JavaScript, React").split(",").map(s=>s.trim()).filter(Boolean).slice(0,8);
  const proj = (d.proj||[])[0]?.[0] || "Food Delivery App";
  const one = `Dear Hiring Manager,

I'm applying for the ${role} role at ${company}. With a strong foundation in modern web development and a track record of shipping clean, responsive interfaces, I’m confident I can contribute immediately. Recently, I built ${proj}, focusing on performance, accessibility, and pixel-perfect UI.`;
  const bullets = [
    `Implemented reusable components and state management for faster feature delivery.`,
    `Optimized bundle size and Core Web Vitals for a smoother UX.`,
    `Collaborated with designers and wrote maintainable, documented code.`,
  ];
  const two = `My core skills include ${skills.join(", ")}. I’m comfortable working with APIs, Git workflows, and CI/CD on platforms like Netlify. I value clarity, communication, and thoughtful engineering.`;
  const end = `I would love to discuss how my skills align with ${company}’s goals. Thank you for your time.

Best regards,
${name}`;
  return `${one}\\n\\n• ${bullets.join("\\n• ")}\\n\\n${two}\\n\\n${end}`;
}
render();

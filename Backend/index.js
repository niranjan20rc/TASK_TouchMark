const express = require("express");
const session = require("express-session");
const cors = require("cors");

const app = express();
app.use(express.json());

// ===== CORS =====
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// ===== Session =====
app.use(session({
  secret: "secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 1000*60*60 }
}));

// ===== In-memory storage =====
let users = [{ email: "admin", password: "test" }]; // predefined admin
let employees = [];

// ===== Auth =====
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(400).json({ error: "Invalid credentials" });
  req.session.user = { email };
  res.json({ msg: "Login successful", email });
});

app.get("/api/logout", (req,res)=>{ req.session.destroy(()=>res.json({msg:"Logged out"})) });

// ===== Employee CRUD =====
const isAuth = (req,res,next)=>{ if(!req.session.user) return res.status(401).json({error:"Unauthorized"}); next(); }

app.get("/api/employees", isAuth, (req,res)=>{
  if(req.session.user.email === "admin") return res.json(employees);
  const emp = employees.find(e => e.fullName === req.session.user.email);
  res.json(emp ? [emp] : []);
});

app.post("/api/employees", isAuth, (req,res)=>{
  if(req.session.user.email !== "admin") return res.status(403).json({error:"Access denied"});
  const emp = req.body;
  employees.push(emp);
  // create login for employee
  users.push({ email: emp.fullName, password: "test" });
  res.json({ emp, username: emp.fullName, password: "test" });
});

app.put("/api/employees/:name", isAuth, (req,res)=>{
  if(req.session.user.email !== "admin") return res.status(403).json({error:"Access denied"});
  const idx = employees.findIndex(e=>e.fullName===req.params.name);
  if(idx===-1) return res.status(404).json({error:"Not found"});
  employees[idx] = req.body;
  res.json(employees[idx]);
});

app.delete("/api/employees/:name", isAuth, (req,res)=>{
  if(req.session.user.email !== "admin") return res.status(403).json({error:"Access denied"});
  employees = employees.filter(e=>e.fullName!==req.params.name);
  users = users.filter(u=>u.email!==req.params.name);
  res.json({ msg:"Deleted" });
});

app.listen(5000, ()=>console.log("Server running on http://localhost:5000"));

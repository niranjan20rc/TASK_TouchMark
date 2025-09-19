const express = require("express");
const session = require("express-session");
const cors = require("cors");
const mongoose = require("mongoose");

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

// ===== MongoDB Connection =====
mongoose.connect("mongodb://127.0.0.1:27017/employeeDB")
.then(() => console.log("MongoDB connected"))
.catch(err => console.error("MongoDB connection error:", err));

// ===== Schemas =====
const userSchema = new mongoose.Schema({ email: String, password: String });
const employeeSchema = new mongoose.Schema({
  empCode: String,
  fullName: String,
  email: String,
  phone: String,
  department: String,
  dateOfJoining: String,
  salary:String,
  attendance:String,
});
const payrollSchema = new mongoose.Schema({
  empCode: String,
  basic: Number,
  hra: Number,
  allowance: Number,
  pf: Number,
  tax: Number,
});

const User = mongoose.model("User", userSchema);
const Employee = mongoose.model("Employee", employeeSchema);
const Payroll = mongoose.model("Payroll", payrollSchema);

// ===== Ensure admin =====
(async () => {
  const admin = await User.findOne({ email: "admin" });
  if (!admin) await User.create({ email: "admin", password: "test" });
})();

// ===== Auth =====
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });
  req.session.user = { email };
  res.json({ msg: "Login successful", email });
});


app.get('/api/users/count', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count});
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


app.get("/api/logout", (req,res) => {
  req.session.destroy(() => res.json({ msg: "Logged out" }));
});

// ===== Auth middleware =====
const isAuth = (req,res,next) => {
  if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// ===== Employee CRUD =====
app.get("/api/employees", isAuth, async (req,res) => {
  if (req.session.user.email === "admin") {
    const employees = await Employee.find();
    return res.json(employees);
  }
  const emp = await Employee.findOne({ fullName: req.session.user.email });
  res.json(emp ? [emp] : []);
});

app.post("/api/employees", isAuth, async (req,res) => {
  if (req.session.user.email !== "admin") return res.status(403).json({ error: "Access denied" });
  try {
    const emp = new Employee(req.body);
    await emp.save();
    await User.create({ email: emp.fullName, password: "test" });
    // console.log(emp);
    res.json(emp);
  } catch(err) {
    res.status(500).json({ error: "Error adding employee" });
  }
});

app.delete("/api/employees/:empCode", isAuth, async (req,res) => {
  if (req.session.user.email !== "admin") return res.status(403).json({ error: "Access denied" });
  try {
    const emp = await Employee.findOne({ empCode: req.params.empCode });
    if (!emp) return res.status(404).json({ error: "Employee not found" });

     await Employee.deleteOne({ empCode: req.params.empCode });
    await User.deleteOne({ email: emp.fullName });
    await Payroll.deleteOne({ empCode: emp.empCode });

    res.json({ msg: "Deleted" });
  } catch(err) {
    res.status(500).json({ error: "Error deleting employee" });
  }
});

// ===== Payroll Endpoints =====
app.get("/api/payroll", isAuth, async (req,res) => {
  const payrolls = await Payroll.find();
  res.json(payrolls);
});

app.get("/api/payroll/:empCode", isAuth, async (req,res) => {
  const payroll = await Payroll.findOne({ empCode: req.params.empCode });
  res.json(payroll || {});
});

app.post("/api/payroll/:empCode", isAuth, async (req,res) => {
  if (req.session.user.email !== "admin") return res.status(403).json({ error: "Access denied" });
  try {
    const basic = Number(req.body.basic) || 0;
    const hra = Number(req.body.hra) || 0;
    const allowance = Number(req.body.allowance) || 0;
    const pf = Number(req.body.pf) || 0;
    const tax = Number(req.body.tax) || 0;

    const payroll = await Payroll.findOneAndUpdate(
      { empCode: req.params.empCode },
      { basic, hra, allowance, pf, tax },
      { upsert: true, new: true }
    );
    res.json(payroll);
  } catch(err) {
    res.status(500).json({ error: "Error saving payroll" });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));

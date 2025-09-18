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
mongoose.connect("mongodb://127.0.0.1:27017/employeeDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// ===== Mongoose Schemas =====
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

const employeeSchema = new mongoose.Schema({
  empCode: String,
  fullName: String,
  email: String,
  phone: String,
  department: String,
  dateOfJoining: String
});

const User = mongoose.model("User", userSchema);
const Employee = mongoose.model("Employee", employeeSchema);

// ===== Ensure admin exists =====
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

app.get("/api/logout", (req,res) => {
  req.session.destroy(() => res.json({ msg: "Logged out" }));
});

// ===== Employee CRUD =====
const isAuth = (req,res,next) => {
  if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// Get employees
app.get("/api/employees", isAuth, async (req,res) => {
  if (req.session.user.email === "admin") {
    const employees = await Employee.find();
    return res.json(employees);
  }
  const emp = await Employee.findOne({ fullName: req.session.user.email });
  res.json(emp ? [emp] : []);
});

// Add employee
app.post("/api/employees", isAuth, async (req,res) => {
  if (req.session.user.email !== "admin") return res.status(403).json({ error: "Access denied" });
  const emp = new Employee(req.body);
  await emp.save();
  // create login for employee
  await User.create({ email: emp.fullName, password: "test" });
  res.json({ emp, username: emp.fullName, password: "test" });
});

// Update employee
app.put("/api/employees/:name", isAuth, async (req,res) => {
  if (req.session.user.email !== "admin") return res.status(403).json({ error: "Access denied" });
  const emp = await Employee.findOneAndUpdate({ fullName: req.params.name }, req.body, { new: true });
  if (!emp) return res.status(404).json({ error: "Not found" });
  res.json(emp);
});

// Delete employee
app.delete("/api/employees/:name", isAuth, async (req,res) => {
  if (req.session.user.email !== "admin") return res.status(403).json({ error: "Access denied" });
  await Employee.deleteOne({ fullName: req.params.name });
  await User.deleteOne({ email: req.params.name });
  res.json({ msg: "Deleted" });
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));

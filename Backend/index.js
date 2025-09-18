const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(express.json());

// ===== CORS =====
app.use(
  cors({
    origin: "http://localhost:5173", // React frontend
    credentials: true,
  })
);

// ===== Session =====
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, 
      httpOnly: true,
      maxAge: 1000 * 60 * 60,
    },
  })
);

// ===== MongoDB =====
mongoose
  .connect("mongodb://127.0.0.1:27017/payroll", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// ===== Schemas =====
const UserSchema = new mongoose.Schema({
  email: String,
  password: String,
  failedAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
});
const User = mongoose.model("User", UserSchema);

const EmployeeSchema = new mongoose.Schema({
  empCode: String,
  fullName: String,
  email: String,
  phone: String,
  department: String,
  dateOfJoining: Date,
});
const Employee = mongoose.model("Employee", EmployeeSchema);

// ===== Middleware =====
const isAuth = (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });
  next();
};

// ===== Auth Routes =====
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ error: "Email already exists" });

  const hash = await bcrypt.hash(password, 10);
  await User.create({ email, password: hash });
  res.json({ msg: "User Registered" });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  if (user.lockUntil && user.lockUntil > Date.now())
    return res.status(403).json({ error: "Account locked. Try again later." });

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    user.failedAttempts += 1;
    if (user.failedAttempts >= 5) {
      user.lockUntil = Date.now() + 10 * 60 * 1000; // 10 min
      user.failedAttempts = 0;
    }
    await user.save();
    return res.status(400).json({ error: "Invalid credentials" });
  }

  user.failedAttempts = 0;
  user.lockUntil = null;
  await user.save();

  req.session.user = user;
  res.json({ msg: "Login Successful" });
});

app.get("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ msg: "Logged out" }));
});

// ===== Employee CRUD =====
app.get("/api/employees", isAuth, async (req, res) => {
  const employees = await Employee.find();
  res.json(employees);
});

app.post("/api/employees", isAuth, async (req, res) => {
  const { empCode, fullName, email, phone, department, dateOfJoining } = req.body;
  if (!empCode || !fullName || !email || !phone || !department || !dateOfJoining)
    return res.status(400).json({ error: "All fields required" });

  const emp = await Employee.create({ empCode, fullName, email, phone, department, dateOfJoining });
  res.json(emp);
});

app.put("/api/employees/:id", isAuth, async (req, res) => {
  const { empCode, fullName, email, phone, department, dateOfJoining } = req.body;
  const emp = await Employee.findByIdAndUpdate(
    req.params.id,
    { empCode, fullName, email, phone, department, dateOfJoining },
    { new: true }
  );
  res.json(emp);
});

app.delete("/api/employees/:id", isAuth, async (req, res) => {
  await Employee.findByIdAndDelete(req.params.id);
  res.json({ msg: "Employee Deleted" });
});

// ===== Start Server =====
app.listen(5000, () => console.log("Server running on http://localhost:5000"));

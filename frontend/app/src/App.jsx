import React, { useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";

import Dashboard from "../components/Dashboard";
import "./App.css";

const api = axios.create({ baseURL: "http://localhost:5000/api", withCredentials: true });

export default function App() {
  const [creds, setCreds] = useState({ email: "", password: "" });
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newEmp, setNewEmp] = useState({ empCode:"", fullName:"", email:"", phone: "", department: "", dateOfJoining: "",attendance:"" });
  const [showPayroll, setShowPayroll] = useState({});
  const [payrollData, setPayrollData] = useState({});

  // ===== Auth =====
  const login = async () => {
    try {
      const res = await api.post("/login", creds);
      setUser(res.data.email);
      setError("");
      await loadEmployees();
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  const logout = async () => {
    await api.get("/logout");
    setUser(null);
    setEmployees([]);
    setPayrollData({});
  };

  // ===== Employees =====
  const loadEmployees = async () => {
    const res = await api.get("/employees");
    setEmployees(res.data);
    await loadPayroll();
  };

  const saveEmployee = async () => {
    try {
      const one_Day_salary=newEmp.salary/26;
      const total_salary=one_Day_salary*newEmp.attendance;
      // console.log(newEmp.attendance);
      newEmp.salary=total_salary;
      await api.post("/employees", newEmp);
      setNewEmp({ empCode: "", fullName: "", email: "", phone: "", department: "", dateOfJoining: "",attendance:""});
      setShowForm(false);
      loadEmployees();
    } catch {
      alert("Error adding employee");
    }
  };


  // ===== Payroll =====
  const isAdmin = user === "admin";

  const togglePayroll = (empCode) => {
    setShowPayroll({ ...showPayroll, [empCode]: !showPayroll[empCode] });
  };

  const handlePayrollChange = (empCode, field, value) => {
    setPayrollData({
      ...payrollData,
      [empCode]: { ...payrollData[empCode], [field]: Number(value) },
    });
  };

  const calculateSalary = (emp) => {
    const empPayroll = payrollData[emp.empCode] || {};
    const basic = Number(empPayroll.basic || 0);
    const hra = (basic * Number(empPayroll.hra || 0)) / 100;
    const allowance = (basic * Number(empPayroll.allowance || 0)) / 100;
    const grossSalary = basic + hra + allowance;
    const pf = (basic * Number(empPayroll.pf || 0)) / 100;
    const tax = (basic * Number(empPayroll.tax || 0)) / 100;
    const deductions = pf + tax;
    
    const gross=Number(grossSalary);
    const mygross = Number(basic+(basic*((hra)/100))+(basic*allowance))
    const mydeduction = Number((gross*(pf/100) )+ (gross*(tax/100)))
    const mynet = mygross - mydeduction
const netSalary=mynet;
    return { grossSalary, pf, tax, mydeduction, netSalary };
  };

  const downloadPayslipPDF = (emp) => {
    const { grossSalary, pf, tax, netSalary,mydeduction } = calculateSalary(emp);
    const empPayroll = payrollData[emp.empCode] || {};
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(`Payslip for ${emp.fullName}`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Employee Code: ${emp.empCode}`, 20, 30);
    doc.text(`Department: ${emp.department}`, 20, 36);
    doc.text(`Date of Joining: ${emp.dateOfJoining}`, 20, 42);
    doc.text("-----------------------------", 20, 50);
    doc.text(`Basic: ${empPayroll.basic || 0}`, 20, 58);
    doc.text(`HRA: ${empPayroll.hra || 0}%`, 20, 64);
    doc.text(`Allowance: ${empPayroll.allowance || 0}%`, 20, 70);
    doc.text(`PF: ${empPayroll.pf || 0}%`, 20, 76);
    doc.text(`Tax: ${empPayroll.tax || 0}%`, 20, 82);
    doc.text("-----------------------------", 20, 90);
    doc.text(`Gross Salary: ${grossSalary}`, 20, 98);
    doc.text(`Deductions: ${pf + tax}`, 20, 104);
    doc.text(`Net Salary: ${netSalary}`, 20, 110);
    // console.log(Number(grossSalary)-Number(mydeduction));
    console.log(grossSalary,mydeduction);

    doc.save(`${emp.fullName}_payslip.pdf`);
  };

  const loadPayroll = async () => {
    const res = await api.get("/payroll");
    const payrollMap = {};
    res.data.forEach((p) => {
      payrollMap[p.empCode] = {
        basic: p.basic,
        hra: p.hra,
        allowance: p.allowance,
        pf: p.pf,
        tax: p.tax,
      };
    });
    setPayrollData(payrollMap);
  };


  const savePayroll = async (empCode) => {
    try {
      const data = {
        basic: Number(payrollData[empCode]?.basic || 0),
        hra: Number(payrollData[empCode]?.hra || 0),
        allowance: Number(payrollData[empCode]?.allowance || 0),
        pf: Number(payrollData[empCode]?.pf || 0),
        tax: Number(payrollData[empCode]?.tax || 0),
      };
      try{

        const base_salary=data.basic;
        const one_Day_salary=base_salary/26;
        total_month_salary = one_Day_salary * employees.attendance;
        data.basic=total_month_salary;
        
        console.log(data);
      }
      catch(error){
        console.log(error.message);
      }
      await api.post(`/payroll/${empCode}`, data);
      alert("Payroll saved to database!");
    } catch {
      alert("Error saving payroll");
    }
  };

  if (!user) {
    return (
      <div className="auth-page">
        <h2>Login</h2>
        {error && <div className="error-msg">{error}</div>}
        <input placeholder="Username" className="input-field" value={creds.email} onChange={(e) => setCreds({ ...creds, email: e.target.value })} />
        <input type="password" placeholder="Password" className="input-field" value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} />
        <button className="btn btn-save" onClick={login}>Login</button>
      </div>
    );
  }

  return (
<div style={{paddingTop:"5rem"}}>
  <Dashboard/>
<div className="main-page">
      <header className="header">
        <h2>Employee Management</h2>
        <button className="btn btn-logout" onClick={logout}>Logout</button>
        {isAdmin && <button className="btn btn-save" onClick={() => setShowForm(true)}>Add Employee</button>}
      </header>

      {showForm && isAdmin && (
        <div className="employee-form-section">
          {["empCode", "fullName", "email", "phone", "department", "dateOfJoining","attendance"].map((f) => (
            <input
            key={f}
            className="input-field"
            type={f === "dateOfJoining" ? "date" : "text"}
            placeholder={f}
            value={newEmp[f]}
            onChange={(e) => setNewEmp({ ...newEmp, [f]: e.target.value })}
            />
          ))}
          <button className="btn btn-save" onClick={saveEmployee}>Save</button>
          <button className="btn btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
        </div>
      )}

      <input className="input-field" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />

      <table className="" >
        <thead>
          <tr>
            <th>Code</th><th>Name</th><th>Email</th><th>Phone</th><th>Dept</th><th>DOJ</th>
            {/* {isAdmin && <th></th>} */}
            {/* {isAdmin && <th>salary</th>} */}
            {isAdmin && <th>Attendance</th>}
            {/* {isAdmin && <th>Actions</th>} */}
            {isAdmin && <th>Payroll</th>}
          </tr>
        </thead>
        <tbody>
          {employees.filter((e) => e.fullName.toLowerCase().includes(search.toLowerCase())).map((e) => {
            // const { grossSalary, deductions } = calculateSalary(e);
            return (
              <tr key={e._id}>
                <td style={{padding:"1rem"}}>{e.empCode}</td>
                <td style={{padding:"1rem"}}>{e.fullName}</td>
                <td style={{padding:"1rem"}}>{e.email}</td>
                <td style={{padding:"1rem"}}>{e.phone}</td>
                <td style={{padding:"1rem"}}>{e.department}</td>
                <td style={{padding:"1rem"}}>{e.dateOfJoining}</td>
                {/* <td style={{padding:"1rem"}}>{e.salary}</td> */}
                <td style={{padding:"1rem"}}>{e.attendance}</td>
                {/* {isAdmin && <td>{grossSalary}</td>}
                {isAdmin && <td>{deductions}</td>} */}
                {isAdmin && (
                  <td>
                    {/* <button className="btn btn-delete" onClick={() => deleteEmployee(e.empCode)}>Delete</button> */}
                    <button className="btn btn-save" onClick={() => downloadPayslipPDF(e)}>Download PDF</button>
                    <button className="btn btn-toggle" onClick={() => togglePayroll(e.empCode)}>
                      {showPayroll[e.empCode] ? "Hide Payroll" : "Set Payroll"}
                    </button>
                    {showPayroll[e.empCode] && (
                      <div className="payroll-form-per-employee">
                        {["basic", "hra", "allowance", "pf", "tax"].map((field) => (
                          <input
                          key={field}
                          type="number"
                          placeholder={field.toUpperCase()}
                          value={payrollData[e.empCode]?.[field] || ""}
                          onChange={(ev) => handlePayrollChange(e.empCode, field, ev.target.value)}
                          />
                        ))}
                        <button className="btn btn-save" onClick={() => savePayroll(e.empCode)}>Save Payroll</button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
          </div>
  );
}

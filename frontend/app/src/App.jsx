import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

export default function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [creds, setCreds] = useState({ email: "", password: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const emptyEmp = {
    empCode: "",
    fullName: "",
    email: "",
    phone: "",
    department: "",
    dateOfJoining: "",
  };
  const [newEmp, setNewEmp] = useState(emptyEmp);

  // ===== Auth Functions =====
  const handleAuth = async () => {
    try {
      setErrorMsg("");
      if (isLogin) {
        await api.post("/login", creds);
      } else {
        await api.post("/register", creds);
        await api.post("/login", creds);
      }
      setIsAuthenticated(true);
      loadEmployees();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || "Authentication Failed");
    }
  };

  const logout = async () => {
    await api.get("/logout");
    setIsAuthenticated(false);
    setEmployees([]);
    setFilteredEmployees([]);
    setCreds({ email: "", password: "" });
  };

  // ===== Employee CRUD =====
  const loadEmployees = async () => {
    try {
      const res = await api.get("/employees");
      setEmployees(res.data);
      setFilteredEmployees(res.data);
    } catch {
      setEmployees([]);
      setFilteredEmployees([]);
    }
  };

  const saveEmployee = async () => {
    try {
      if (editId) {
        await api.put(`/employees/${editId}`, newEmp);
        setEditId(null);
      } else {
        await api.post("/employees", newEmp);
      }
      setNewEmp(emptyEmp);
      setShowForm(false);
      loadEmployees();
    } catch (err) {
      alert(err.response?.data?.error || "Error saving employee");
    }
  };

  const cancelEdit = () => {
    setNewEmp(emptyEmp);
    setEditId(null);
    setShowForm(false);
  };

  const deleteEmployee = async (id) => {
    await api.delete(`/employees/${id}`);
    loadEmployees();
  };

  // ===== Search =====
  useEffect(() => {
    if (!searchTerm) {
      setFilteredEmployees(employees);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredEmployees(
        employees.filter(
          (e) =>
            e.empCode.toLowerCase().includes(term) ||
            e.fullName.toLowerCase().includes(term) ||
            e.email.toLowerCase().includes(term) ||
            e.department.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, employees]);

  // ===== Render Login/Signup =====
  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <h2>{isLogin ? "Login" : "Sign Up"}</h2>
        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        <input
          className="input-field"
          placeholder="Email"
          value={creds.email}
          onChange={(e) => setCreds({ ...creds, email: e.target.value })}
        />
        <input
          className="input-field"
          type="password"
          placeholder="Password"
          value={creds.password}
          onChange={(e) => setCreds({ ...creds, password: e.target.value })}
        />

        <button className="btn btn-save" onClick={handleAuth}>
          {isLogin ? "Login" : "Sign Up"}
        </button>

        <button
          className="btn btn-cancel"
          onClick={() => {
            setIsLogin(!isLogin);
            setErrorMsg("");
          }}
        >
          {isLogin ? "Create Account" : "Back to Login"}
        </button>
      </div>
    );
  }

  // ===== Main Menu =====
  return (
    <div className="main-page">
      <header className="header">
        <h2>Employee Management</h2>
        <div>
          <button className="btn btn-save" onClick={() => {setShowForm(true); setEditId(null); setNewEmp(emptyEmp);}}>
            Add Employee
          </button>
          <button className="btn btn-logout" onClick={logout}>Logout</button>
        </div>
      </header>

      {/* Search */}
      <div className="search-bar">
        <input
          className="input-field"
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Employee Form */}
      {showForm && (
        <section className="employee-form-section">
          <h3>{editId ? "Edit Employee" : "Add Employee"}</h3>
          {["empCode","fullName","email","phone","department","dateOfJoining"].map((field)=>(
            <input
              key={field}
              className="input-field"
              type={field==="dateOfJoining"?"date":"text"}
              placeholder={field}
              value={newEmp[field]}
              onChange={(e)=>setNewEmp({...newEmp,[field]:e.target.value})}
            />
          ))}
          <div className="form-buttons">
            <button className="btn btn-save" onClick={saveEmployee}>Save</button>
            <button className="btn btn-cancel" onClick={cancelEdit}>Cancel</button>
          </div>
        </section>
      )}

      {/* Employee Table */}
      <section className="employee-table-section">
        <h3>Employee List</h3>
        <table className="employee-table">
          <thead>
            <tr>
              <th>Code</th><th>Name</th><th>Email</th><th>Phone</th><th>Dept</th><th>DOJ</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(e=>(
              <tr key={e._id}>
                <td>{e.empCode}</td>
                <td>{e.fullName}</td>
                <td>{e.email}</td>
                <td>{e.phone}</td>
                <td>{e.department}</td>
                <td>{e.dateOfJoining?.slice(0,10)}</td>
                <td>
                  <button className="btn btn-edit" onClick={()=>{setNewEmp(e); setEditId(e._id); setShowForm(true);}}>Edit</button>
                  <button className="btn btn-delete" onClick={()=>deleteEmployee(e._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

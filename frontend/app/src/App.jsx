import React,{useState,useEffect} from "react";
import axios from "axios";
import "./App.css";

const api = axios.create({baseURL:"http://localhost:5000/api", withCredentials:true});

export default function App(){
  const [creds,setCreds] = useState({email:"",password:""});
  const [user,setUser] = useState(null);
  const [error,setError] = useState("");
  const [employees,setEmployees] = useState([]);
  const [search,setSearch] = useState("");
  const [showForm,setShowForm] = useState(false);
  const [newEmp,setNewEmp] = useState({empCode:"",fullName:"",email:"",phone:"",department:"",dateOfJoining:""});

  const login = async ()=>{
    try{
      const res = await api.post("/login", creds);
      setUser(res.data.email);
      setError("");
      loadEmployees();
    }catch(err){ setError(err.response?.data?.error || "Login failed"); }
  }

  const logout = async ()=>{ await api.get("/logout"); setUser(null); setEmployees([]); setNewEmp({empCode:"",fullName:"",email:"",phone:"",department:"",dateOfJoining:""}); }

  const loadEmployees = async ()=>{
    const res = await api.get("/employees");
    setEmployees(res.data);
  }

  const saveEmployee = async ()=>{
    await api.post("/employees", newEmp);
    setNewEmp({empCode:"",fullName:"",email:"",phone:"",department:"",dateOfJoining:""});
    setShowForm(false);
    loadEmployees();
  }

  const deleteEmployee = async(name)=>{ await api.delete(`/employees/${name}`); loadEmployees(); }

  const isAdmin = user==="admin";

  if(!user){
    return(
      <div className="auth-page">
        <h2>Login</h2>
        {error && <div className="error-msg">{error}</div>}
        <input placeholder="Username" className="input-field" value={creds.email} onChange={e=>setCreds({...creds,email:e.target.value})}/>
        <input type="password" placeholder="Password" className="input-field" value={creds.password} onChange={e=>setCreds({...creds,password:e.target.value})}/>
        <button className="btn btn-save" onClick={login}>Login</button>
      </div>
    )
  }

  return(
    <div className="main-page">
      <header className="header">
        <h2>Employee Management</h2>
        <button className="btn btn-logout" onClick={logout}>Logout</button>
        {isAdmin && <button className="btn btn-save" onClick={()=>setShowForm(true)}>Add Employee</button>}
      </header>

      {showForm && isAdmin && (
        <div className="employee-form-section">
          {["empCode","fullName","email","phone","department","dateOfJoining"].map(f=>(
            <input key={f} className="input-field" type={f==="dateOfJoining"?"date":"text"} placeholder={f} value={newEmp[f]} onChange={e=>setNewEmp({...newEmp,[f]:e.target.value})}/>
          ))}
          <button className="btn btn-save" onClick={saveEmployee}>Save</button>
          <button className="btn btn-cancel" onClick={()=>setShowForm(false)}>Cancel</button>
        </div>
      )}

      <input className="input-field" placeholder="Search" value={search} onChange={e=>setSearch(e.target.value)}/>
      <table className="employee-table">
        <thead><tr><th>Code</th><th>Name</th><th>Email</th><th>Phone</th><th>Dept</th><th>DOJ</th>{isAdmin&&<th>Actions</th>}</tr></thead>
        <tbody>
          {employees.filter(e=>e.fullName.toLowerCase().includes(search.toLowerCase())).map(e=>(
            <tr key={e.fullName}>
              <td>{e.empCode}</td><td>{e.fullName}</td><td>{e.email}</td><td>{e.phone}</td><td>{e.department}</td><td>{e.dateOfJoining}</td>
              {isAdmin && <td><button className="btn btn-delete" onClick={()=>deleteEmployee(e.fullName)}>Delete</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
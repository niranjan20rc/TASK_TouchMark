import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
  const [userCount, setUserCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserCount() {
      try {
        const res = await axios.get("http://localhost:5000/api/users/count", { withCredentials: true });
        setUserCount(res.data.count);
      } catch (err) {
        console.error("Error fetching user count:", err);
        setUserCount("Error");
      } finally {
        setLoading(false);
      }
    }

    fetchUserCount();
  }, []);

  return (
    <div>

    <div style={{}}>

    <div style={{padding: "20px", textAlign: "center", border: "1px solid #ddd", borderRadius: "8px", width: "200px", margin: "20px auto" }}>
      <h2>User Dashboard</h2>
      {loading ? <p>Loading...</p> : <p>Total Users: <strong>{userCount}</strong></p>}
    </div>
    </div>
    
    </div>
  );
}

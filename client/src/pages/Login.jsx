// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import '../styles/Login.css';

const dummyUsers = [
  { email: "student@email.com", password: "1234", role: "student" },
  { email: "lecturer@email.com", password: "abcd", role: "lecturer" }
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    const user = dummyUsers.find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
      localStorage.setItem("token", "fake-jwt");
      localStorage.setItem("role", user.role);

      if (user.role === "student") navigate("/student/dashboard");
      else if (user.role === "lecturer") navigate("/lecturer/dashboard");
    } else {
      alert("Invalid email or password");
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2 className="login-title">Login</h2>
        <div className="form-group">
          <input
            type="email"
            placeholder="Email"
            className="form-input"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <input
            type="password"
            placeholder="Password"
            className="form-input"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button className="login-button" onClick={handleLogin}>Log In</button>
      </div>
    </div>
  );
};

export default Login;


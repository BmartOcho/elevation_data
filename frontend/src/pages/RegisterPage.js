import React, { useState } from "react";
import axios from "axios";

function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/api/auth/register", {
        email,
        password,
      });
      alert("Registration successful!");
    } catch (error) {
      console.error("Registration error:", error);
      console.error("Full response:", error.response);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.statusText ||
        error.message ||
        "An unknown error occurred.";
      alert("Registration failed: " + errorMessage);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Register</h1>
      <label>
        Email:
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label>
        Password:
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <button type="submit">Register</button>
    </form>
  );
}

export default RegisterPage;

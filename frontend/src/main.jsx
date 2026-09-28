import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BrowserRouter } from "react-router";
import { GoogleOAuthProvider } from "@react-oauth/google";

import "./index.css";
import { ToastContainer } from "react-toastify";

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId="339823574784-ohhtqj0dj5v1t6honk2l1tc87kjbmmou.apps.googleusercontent.com">
    <BrowserRouter>
      <React.StrictMode>
        <App />
        <ToastContainer />
      </React.StrictMode>
    </BrowserRouter>
  </GoogleOAuthProvider>,
);

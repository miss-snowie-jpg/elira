import { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import "./Auth.css";
import starField from "../components/animations/starField";
import { Mail, Password, Person, Google } from "@mui/icons-material";
import ReCaptcha from "react-google-recaptcha";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { Slide, toast } from "react-toastify";

function Auth({ engine }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = JSON.parse(localStorage.getItem("user"))

  const canvasBG = useRef(null);
  const isSignUp = searchParams.get("signup") == "true";

  useEffect(() => {
    if(user !== null) navigate("/dashboard")
  }, [])

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
  };

  // Centralized login function accepting arguments to override stale state
  // Centralized login function accepting arguments to override stale state
  const handleLogin = async (
    loginEmail,
    loginPassword,
    googleLogin = false,
  ) => {
    let success = false;
    try {
      const response = await axios.post("/api/auth/login", {
        email: loginEmail || email,
        password: loginPassword || password,
        googleLogin,
      });
      console.log(response.data); // FIX: Moved inside try block to resolve scoping error
      localStorage.setItem(
        "user",
        JSON.stringify({
          name: response.data.user.username,
          email: response.data.user.email,
          id: response.data.user.id
        }),
      );
      success = true;
    } catch (e) {
      // Only toast error during manual email entries, skip during automated background Google checks
      if (!googleLogin) {
        toast.error(`Login failed: ${e.response?.data?.message || e.message}`, {
          position: "top-right",
          autoClose: 5000,
          theme: "dark",
          transition: Slide,
        });
      }
    }
    return success;
  };

  const handleGoogleLoginSuccess = async (tokenResponse) => {
    try {
      const googleUser = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        },
      );

      const { email: gEmail, name: gName } = googleUser.data;
      const generatedPassword = crypto.randomUUID();

      setEmail("");
      setUsername("");
      setPassword("");

      // FIX: Optimistic Auth Routing. Try logging in first.
      const loginAttempt = await handleLogin(gEmail, generatedPassword, true);

      // If login fails, user does not exist in your database yet -> Register them
      if (!loginAttempt) {
        // Correct parameter tracking alignment: username, email, password, isHuman
        await handleRegister(
          gName || "GoogleUser",
          gEmail,
          generatedPassword,
          true,
        );

        // Finalize login once registration finishes setup
        await handleLogin(gEmail, generatedPassword, true);
      } else {
        toast.success("Welcome back!");
        navigate("/dashboard"); // Send logged in user to dashboard/home root route
      }
    } catch (error) {
      console.error("Google profile retrieval failed:", error.message);
      toast.error("Google authentication failed.");
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleLoginSuccess,
    onError: () => console.log("Custom Google login failed"),
  });

  const handleRegister = async (
    psdusername,
    psdemail,
    psdpassword,
    isHuman,
  ) => {
    if (isHuman || captchaToken) {
      try {
        const response = await axios.post("/api/auth/register", {
          username: psdusername || username,
          email: psdemail || email,
          password: psdpassword || password,
        });
        localStorage.setItem(
          "user",
          JSON.stringify({
            name: response.data.user.username,
            email: response.data.user.email,
            id: response.data.user.id
          }),
        );
      } catch (e) {
        toast.error(`Registeration failed: ${e.response.data.message}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "dark",
          transition: Slide,
        });
      }
    } else {
      toast.error("Please Complete Captcha To Continue", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
        transition: Slide,
      });
    }
  };

  useEffect(() => {
    const canvas = canvasBG.current;
    const ctx = canvas.getContext("2d");

    canvas.width = innerWidth;
    canvas.height = innerHeight;

    const anim = starField(ctx, canvas, 360, 90);
    engine.add(anim);
  }, []);

  return (
    <>
      <canvas ref={canvasBG} className="canvas-bg" />
      <div className="login-container">
        <div className="login-card">
          <button className="back-btn" onClick={() => navigate("/")}>
            ←
          </button>
          <div className="login-header">
            <h1 className="brand-title">ELIRA</h1>
            <p className="header-sub">
              {!isSignUp
                ? "Welcome back. Access your workspace."
                : "Welcome, We are excited to see what you'll create!"}
            </p>
          </div>
          {isSignUp && (
            <div className="form-group">
              <Person />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="form-input"
              />
            </div>
          )}
          <div className="form-group">
            <Mail />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <Password />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="form-input"
            />
          </div>
          {isSignUp && (
            <ReCaptcha
              onChange={handleCaptchaChange}
              sitekey="6LesQXwtAAAAAJJvhNXYJOdBl4jfqI4GkGhSWgkj"
            />
          )}
          <button
            className="submit-btn"
            onClick={!isSignUp ? () => handleLogin() : () => handleRegister()}
          >
            {!isSignUp ? "Log In" : "Sign Up"}
          </button>
          <div className="login-footer">
            {isSignUp ? (
              <>
                Have an account? <Link to="/auth">Login</Link>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <Link to="/auth?signup=true">Sign Up</Link>
              </>
            )}
            <p className="muted-title">Or Login With</p>
            <div className="external-menu">
              <button type="button" onClick={() => googleLogin()}>
                <Google />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Auth;

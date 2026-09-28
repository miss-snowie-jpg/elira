import React from "react";
import { useNavigate } from "react-router";
import "./Header.css";
import starField from "./animations/starField";

function Header({ engine }) {
  const canvasRef = React.useRef(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const STAR_COUNT = 90;
    const MAX_DISTANCE = 90;
    canvas.height = 83;

    engine.add(starField(ctx, canvas, STAR_COUNT, MAX_DISTANCE));
  }, []);

  return (
    <header>
      <canvas className="header-bg" ref={canvasRef}></canvas>

      <div>
        <h2>ELIRA</h2>

        <nav>
          {!user ? (
            <>
              <button onClick={() => navigate("/auth")}>Login</button>
              <button className="primary">Sign Up</button>
            </>
          ) : (
            <img 
              src={`https://ui-avatars.com/api/?name=${user.name}&background=ffaa00&color=fff&rounded=true&bold=true&size=256`}
              width={64}
              height={64}
            />
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;

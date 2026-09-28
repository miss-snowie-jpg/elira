import React, { useEffect } from "react"
import Header from "../components/Header"
import "./Landing.css"
import terminalTool from "../components/animations/matrixRain"

function Landing({engine}) {
  const canvasRef = React.useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    engine.add(terminalTool(canvas,ctx,["Elira AI", "> Engine Initializing...", "> Connecting to Server...", "> Fetching Models..."], 12))
  }, [])

  return (
    <>
      <Header engine={engine}/>
      <canvas className="hero-bg" ref={canvasRef}></canvas>
      
      {/* Hero Section */}
      <section className="hero-section">
        <h1>Designed for Leaders. Powered by AI.</h1>
        <p>Beautiful software that thinks alongside you</p>
        <div>
          <button className="primary">Start Free</button>
          <button>Book a Demo</button>
        </div>
      </section>

      {/* Stats Counter Bar */}
      <section className="stats-bar">
        <div className="stat-item">
          <div className="stat-num">$1.2B+</div>
          <div className="stat-desc">Total Value Locked</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">250K+</div>
          <div className="stat-desc">Active Agents</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">&lt; 0.01s</div>
          <div className="stat-desc">Execution Latency</div>
        </div>
        <div className="stat-item">
          <div className="stat-num">99.99%</div>
          <div className="stat-desc">Uptime Guarantee</div>
        </div>
      </section>

      {/* Middle Feature Grid */}
      <section className="feature-block">
        <div className="feature-header">
          <span className="section-pill">SYSTEM ARCHITECTURE</span>
          <h2>Built for Autonomous Scale</h2>
          <p>Unifying AI intelligence with institutional-grade security.</p>
        </div>

        <div className="cards-grid">
          <div className="feature-box active-glow">
            <div className="box-icon">⚡</div>
            <h3>Autonomous Execution</h3>
            <p>Deploy specialized scripts that evaluate market trends and auto-manage digital operations continuously.</p>
          </div>

          <div className="feature-box">
            <div className="box-icon">🛡️</div>
            <h3>Bulletproof Security</h3>
            <p>Static analysis auditing with encrypted key management designed to keep your infrastructure safe.</p>
          </div>

          <div className="feature-box">
            <div className="box-icon">🌐</div>
            <h3>Cross-Chain Telemetry</h3>
            <p>Instant multi-platform synchronization with direct API routing for seamless operations.</p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="cta-section">
        <div className="cta-card">
          <div>
            <h2>Ready to Elevate Your Workflow?</h2>
            <p>Join thousands of founders and leaders leveraging Elira AI today.</p>
          </div>
          <button className="primary">Get Started Free</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-left">
            <h2 className="footer-brand">ELIRA</h2>
            <p className="footer-copy">Beautiful software that thinks alongside you.</p>
          </div>

          <div className="footer-nav">
            <div className="nav-col">
              <h4>Platform</h4>
              <a href="#features">Features</a>
              <a href="#agents">AI Agents</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className="nav-col">
              <h4>Developers</h4>
              <a href="#docs">Documentation</a>
              <a href="#api">API Reference</a>
              <a href="#github">GitHub</a>
            </div>
            <div className="nav-col">
              <h4>Organization</h4>
              <a href="#about">About</a>
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
            </div>
          </div>
        </div>
        
        <div className="footer-copyright">
          &copy; {new Date().getFullYear()} Elira Tech Solutions. All rights reserved.
        </div>
      </footer>
    </>
  )
}

export default Landing
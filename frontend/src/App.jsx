import { Routes, Route } from "react-router";
import Engine from "./utils/engine";
import Chat from "./pages/Chat";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
function App() {
  const engine = new Engine();
  engine.start();
  return (
    <Routes>
      <Route index element={<Landing engine={engine} />} />
      <Route path="/auth" element={<Auth engine={engine} />} />
      <Route path="/dashboard" element={<Dashboard engine={engine} />}/>
      <Route path="/chat" element={<Chat engine={engine} />}/>
      <Route path="/documents" element={<Documents />}/>
    </Routes>
  );
}

export default App;

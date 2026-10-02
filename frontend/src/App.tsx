import { useEffect, useState } from 'react';
import DocumentList from "./components/DocumentList";
import './App.css'

type HealthState = "checking" | "healthy" | "unhealthy";


function App() {
  const[health, setHealth] = useState<HealthState>("checking");

  useEffect(() => {
    const controller = new AbortController();

    async function checkhealth() {

      try{
        const res = await fetch("/health", { signal: controller.signal });
        const data = await res.json();
        setHealth(res.ok && data.status === "OK" ? "healthy" : "unhealthy");
      } catch (err){
        if ((err as Error).name  !==  "AbortError") setHealth("unhealthy");
      }
    }

    checkhealth();
    return () => controller.abort();

  }, []);

  const label = {
    checking: "Checking...",
    healthy: "Database connected.",
    unhealthy: "Database unreachable."
  }[health]

  return(
    <div className="app">
      <header className="topbar">
        <h1 className="brand">📄 DocHub</h1>
        <span className={`pill pill--${health}`}>
          <span className="dot"/>
          {label}
        </span>
      </header>

      <main className="content">
        <DocumentList />
      </main>
    </div>
  );
}

export default App

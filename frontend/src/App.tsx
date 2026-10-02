import { useEffect, useState } from 'react';
import DocumentList from "./components/DocumentList";
import UploadForm from "./components/UploadForm";
import './App.css'

type HealthState = "checking" | "healthy" | "unhealthy";


function App() {
  const[health, setHealth] = useState<HealthState>("checking");
  const [showUpload, setShowUpload] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
        <div className="toolbar">
          <h2 className="page-title">Documents</h2>
          {!showUpload && (
              <button className="btn btn--primary" onClick={() => setShowUpload(true)}>
                  + Upload document
              </button>
          )}
        </div>

        {showUpload && (
          <UploadForm 
            onCancel={() => setShowUpload(false)}
            onUploaded={() => {
              setShowUpload(false);
              setRefreshKey((k) => k + 1);
            }}
          />
        )}

        <DocumentList refreshKey={refreshKey} />
      </main>
    </div>
  );
}

export default App

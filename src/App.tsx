import React from "react";
import ExplorerTabs from "./components/ExplorerTabs";

function App() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main style={{ flex: 1 }}>
        <ExplorerTabs />
      </main>
    </div>
  );
}

export default App;

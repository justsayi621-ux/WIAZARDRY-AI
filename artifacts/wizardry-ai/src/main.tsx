import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setDefaultHeaders } from "@workspace/api-client-react";

// Read stored user ID — 0 means not logged in (no fallback to 1)
const storedUserId = (() => {
  try {
    const v = localStorage.getItem("wizardry_user_id");
    if (!v) return 0;
    const id = parseInt(v, 10);
    return isNaN(id) || id <= 0 ? 0 : id;
  } catch {
    return 0;
  }
})();

if (storedUserId > 0) {
  setDefaultHeaders({ "x-user-id": String(storedUserId) });
}

createRoot(document.getElementById("root")!).render(<App />);
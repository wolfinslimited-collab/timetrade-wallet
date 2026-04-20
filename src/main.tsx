// CRITICAL: Import polyfills FIRST before any other imports
import './polyfills';

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNativeShell } from "./lib/nativeInit";

createRoot(document.getElementById("root")!).render(<App />);

// Fire-and-forget native shell setup (no-op on web)
void initNativeShell();

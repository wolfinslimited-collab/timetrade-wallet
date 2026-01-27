import { Buffer } from 'buffer';

// Polyfill Buffer for browser compatibility (required by ed25519-hd-key)
window.Buffer = Buffer;

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

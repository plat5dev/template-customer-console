import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@fontsource-variable/inter/opsz.css"
import "@fontsource-variable/jetbrains-mono"
import "./styles/tokens.css"
import "./styles/ui.css"
import App from "./App"
import { appName } from "./appName"

document.title = appName

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

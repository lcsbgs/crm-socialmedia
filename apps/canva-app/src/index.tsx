import { AppUiProvider } from "@canva/app-ui-kit";
import { createRoot } from "react-dom/client";
import { App } from "./app";

createRoot(document.getElementById("root")!).render(
  <AppUiProvider>
    <App />
  </AppUiProvider>,
);

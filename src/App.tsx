import "./App.css";
import { AppProviders } from "./app/providers/AppProviders";
import { AppShell } from "./ui/components/AppShell";

function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}

export default App;

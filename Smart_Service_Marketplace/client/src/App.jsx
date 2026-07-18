import ErrorBoundary from "./components/ui/ErrorBoundary";
import ServerErrorPage from "./pages/shared/ServerErrorPage";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <ErrorBoundary
      fallback={({ retry }) => <ServerErrorPage onRetry={retry} />}
    >
      <AppRoutes />
    </ErrorBoundary>
  );
}

export default App;

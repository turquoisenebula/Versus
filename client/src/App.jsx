import { Route, Routes } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import AuthRedirect from "./components/layout/AuthRedirect";
import CreateDebate from "./pages/CreateDebate";
import DebateDetail from "./pages/DebateDetail";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Register from "./pages/Register";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Routes>
          <Route element={<Home />} path="/" />
          <Route element={<ProtectedRoute />}>
            <Route element={<CreateDebate />} path="/debates/new" />
          </Route>
          <Route element={<DebateDetail />} path="/debates/:id" />
          <Route element={<Profile />} path="/u/:username" />
          <Route element={<AuthRedirect />}>
            <Route element={<Login />} path="/login" />
            <Route element={<Register />} path="/register" />
          </Route>
          <Route element={<NotFound />} path="*" />
        </Routes>
      </main>
    </div>
  );
}

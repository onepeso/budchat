import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Login from "./Login";
import Chat from "./Chat";
import { MessageCircle } from "lucide-react";
import { ThemeProvider } from "./components/custom/theme-provider";
import { Toaster } from "react-hot-toast";

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <Toaster position="top-right" reverseOrder={false} />
        <header className="sticky z-50 flex items-center justify-center w-full px-6 py-4 bg-gray-800 border-b border-gray-200">
          <MessageCircle className="mr-2 text-white" />
          <h1 className="text-xl font-semibold text-white">
            BudChat - Friends Group Messages
          </h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </main>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

import {Routes, Route} from "react-router-dom";
import {AuthProvider} from "./AuthContext";
import Login from "./Login";
import Chat from "./Chat";
import {MessageCircle} from "lucide-react";


const App = () => {

  return (
    <AuthProvider>
      <header
        className="sticky bg-gray-800 border-b border-gray-200 py-4 px-6 flex items-center justify-center w-full z-50">
        <MessageCircle className="mr-2 text-white"/>
        <h1 className="text-xl font-semibold text-white">BudChat - Friends Group Messages</h1>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Login/>}/>
          <Route path="/chat" element={<Chat/>}/>
        </Routes>
      </main>
    </AuthProvider>
  );
};

export default App;

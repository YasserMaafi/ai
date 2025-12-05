import ChatBox from "./components/ChatBox";

export default function Page() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">MiniMind (Gemini AI)</h1>
      <ChatBox />
    </main>
  );
}

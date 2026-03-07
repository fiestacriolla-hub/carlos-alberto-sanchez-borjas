import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Bot, User } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import Markdown from "react-markdown";

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "model"; text: string }[]>([
    {
      role: "model",
      text: "¡Hola! Soy el Asistente Contable EDUMAR. ¿En qué te puedo ayudar hoy con tus dudas contables, IVA, SENIAT o facturación?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key de Gemini no configurada.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `Eres el 'Asistente Contable EDUMAR', un experto contador público venezolano.
Tu objetivo es ayudar a los usuarios con dudas sobre:
- IVA en Venezuela
- Normas contables venezolanas
- Declaraciones del SENIAT
- Retenciones de IVA e ISLR
- Libro de compras y Libro de ventas
- Errores comunes en facturación

Responde de manera profesional, clara y concisa. Si te preguntan algo fuera del ámbito contable o fiscal venezolano, indica amablemente que solo puedes ayudar con temas contables.`,
        },
      });

      // Send previous history to maintain context if needed, but for simplicity we'll just send the current message
      // In a real app, we'd reconstruct the chat history. For now, we'll just send the latest.
      // To properly use history, we should initialize the chat once or pass history.
      // Since we create a new chat instance here, we'll just pass the whole conversation as a single prompt for simplicity, or better, use the chat history feature.
      
      // Let's build a prompt with history
      const historyPrompt = messages.map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.text}`).join('\n');
      const fullPrompt = `${historyPrompt}\nUsuario: ${userMessage}\nAsistente:`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: fullPrompt,
        config: {
          systemInstruction: `Eres el 'Asistente Contable EDUMAR', un experto contador público venezolano.
Tu objetivo es ayudar a los usuarios con dudas sobre:
- IVA en Venezuela
- Normas contables venezolanas
- Declaraciones del SENIAT
- Retenciones de IVA e ISLR
- Libro de compras y Libro de ventas
- Errores comunes en facturación

Responde de manera profesional, clara y concisa. Si te preguntan algo fuera del ámbito contable o fiscal venezolano, indica amablemente que solo puedes ayudar con temas contables.`,
        }
      });

      setMessages((prev) => [
        ...prev,
        { role: "model", text: response.text || "Lo siento, no pude procesar tu solicitud." },
      ]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Hubo un error al conectar con el asistente. Por favor, intenta de nuevo más tarde.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 bg-blue-700 text-white rounded-full shadow-lg hover:bg-blue-800 hover:scale-105 transition-all flex items-center justify-center z-50 ${isOpen ? "hidden" : ""}`}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-slate-200 flex flex-col">
          {/* Header */}
          <div className="bg-blue-900 text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm">Asistente Contable EDUMAR</h3>
                <p className="text-xs text-blue-200">En línea</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-blue-200 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
                  }`}
                >
                  {msg.role === "model" ? (
                    <div className="markdown-body prose prose-sm prose-blue max-w-none">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  <span className="text-sm text-slate-500">Escribiendo...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Escribe tu consulta aquí..."
                className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shrink-0"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

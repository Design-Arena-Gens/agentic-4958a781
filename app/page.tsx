"use client";

import React, { useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hello, I'm Jarvis. How can I assist you?" }
  ]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.pitch = 1.0;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    synth.speak(utter);
  };

  const toggleMic = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
    } else {
      try {
        setInput("");
        rec.start();
        setListening(true);
      } catch {
        /* no-op */
      }
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;

    const nextMessages = [...messages, { role: "user", content: text } as const];
    setMessages(nextMessages);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      const reply = data.reply || "I had trouble responding just now.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      speak(reply);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error. Please try again." }
      ]);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <span className="dot" />
          <span>Jarvis</span>
        </div>
      </div>

      <div ref={chatRef} className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>{m.content}</div>
        ))}
      </div>

      <div className="hint">
        Tip: Try "weather in Paris", "who is Ada Lovelace", or speak.
      </div>

      <div className="inputBar">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={listening ? "Listening..." : "Ask Jarvis anything"}
        />
        <button className="button secondary" onClick={toggleMic} title="Toggle mic">
          {listening ? "Stop" : "Speak"}
        </button>
        <button className="button" onClick={handleSend} disabled={!input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

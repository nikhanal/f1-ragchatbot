"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import f1 from "@/app/assets/f1.jpg"
import "./chatbot.css"

export default function ChatBot() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: "assistant", content: "Hello! How can I help you today?" },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const newMessage = { role: "user", content: input }
    setMessages([...messages, newMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [...messages, newMessage] }),
      })

      const contentType = response.headers.get("Content-Type")

      if (contentType && contentType.includes("application/json")) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let done = false
        let fullResponse = ""

        while (!done) {
          const { value, done: doneReading } = await reader?.read()
          done = doneReading
          fullResponse += decoder.decode(value, { stream: true })
        }

        setMessages((prev) => [...prev, { role: "assistant", content: fullResponse }])
      } else {
        const text = await response.text()
        console.error("Response is not JSON:", text)
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error." }])
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error." }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <div className="header-content">
          <div className="logo-container">
            {/* <Image src="" alt="F1 Logo" fill className="logo-image" /> */}
          </div>
          <h1 className="header-title">F1 Assistant</h1>
        </div>
      </header>

      {/* Chat Container */}
      <div className="messages-container">
        <div className="messages-list">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message-wrapper ${message.role === "user" ? "user-message-wrapper" : "assistant-message-wrapper"}`}
            >
              <div className={`message-bubble ${message.role === "user" ? "user-message" : "assistant-message"}`}>
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message-wrapper assistant-message-wrapper">
              <div className="message-bubble assistant-message">
                <div className="typing-indicator">
                  <div className="typing-dot" style={{ animationDelay: "0ms" }}></div>
                  <div className="typing-dot" style={{ animationDelay: "150ms" }}></div>
                  <div className="typing-dot" style={{ animationDelay: "300ms" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="input-container">
        <div className="input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your message..."
            className="message-input"
            disabled={isLoading}
          />
          <button onClick={handleSendMessage} disabled={isLoading || !input.trim()} className="send-button">
            <svg xmlns="http://www.w3.org/2000/svg" className="send-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

"use client";
import { useState } from 'react';


export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock address for demo
  const address = '0x1234...5678';

  // Weather prediction logic
  const generateWeatherPrediction = async (query) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simple weather patterns
    const patterns = {
      temp: { min: 15, max: 35 },
      humidity: { min: 30, max: 90 }
    };

    const getRandomValue = (min, max) => 
      Math.floor(Math.random() * (max - min + 1) + min);

    const temp = getRandomValue(patterns.temp.min, patterns.temp.max);
    const humidity = getRandomValue(patterns.humidity.min, patterns.humidity.max);

    // Generate response based on query keywords
    let condition = 'sunny';
    if (query.toLowerCase().includes('rain')) condition = 'rainy';
    if (query.toLowerCase().includes('cloud')) condition = 'cloudy';

    return `The weather is ${condition} with a temperature of ${temp}°C and ${humidity}% humidity.`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isLoading) return;

    setIsLoading(true);
    try {
      // Add user message
      setMessages(prev => [...prev, {
        id: Date.now(),
        query: newMessage,
        sender: address,
        isPending: true
      }]);

      // Generate prediction
      const prediction = await generateWeatherPrediction(newMessage);

      // Update message with response
      setMessages(prev => 
        prev.map(msg => 
          msg.isPending 
            ? {
                ...msg,
                response: prediction,
                isPending: false
              }
            : msg
        )
      );

      setNewMessage('');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate weather prediction');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-[30px] shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold text-blue-600 mb-4">
            AI Weather Assistant
          </h1>
          <p className="text-gray-500">
            Connected: {address}
          </p>
        </div>

        {/* Messages Area */}
        <div className="min-h-[200px] mb-8 overflow-y-auto max-h-[400px]">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === address ? 'justify-end' : 'justify-start'
              } mb-4`}
            >
              <div
                className={`max-w-[80%] rounded-3xl p-4 ${
                  message.sender === address
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100'
                }`}
              >
                <p>{message.query}</p>
                {message.response && <p className="mt-2">{message.response}</p>}
                {message.isPending && (
                  <p className="text-sm italic mt-1">Processing prediction...</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Ask about the weather..."
            className="flex-1 rounded-full bg-gray-50 border-none p-4 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !newMessage.trim()}
            className={`px-8 py-4 rounded-full text-lg font-medium ${
              isLoading || !newMessage.trim()
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
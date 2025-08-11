import React, { useState } from 'react';

const WhatsAppButton: React.FC = () => {
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER;
  const [isHovered, setIsHovered] = useState(false);

  if (!whatsappNumber) {
    return null;
  }

  const whatsappUrl = `https://wa.me/${whatsappNumber}`;

  return (
    <div 
      className="fixed bottom-8 right-8 z-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative flex items-center">
        {/* Tooltip */}
        <div
          className={`absolute right-full mr-4 p-3 bg-green-500 text-black text-sm rounded-md transition-all duration-300 ease-in-out transform w-64 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          Hello! Would you like to negotiate on a price or chat with us?
        </div>
        {/* WhatsApp Button */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-500 text-white p-5 rounded-full shadow-lg hover:bg-green-600 transition-transform transform hover:scale-110"
          aria-label="Chat on WhatsApp"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="feather feather-message-circle"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </a>
      </div>
    </div>
  );
};

export default WhatsAppButton;

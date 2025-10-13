import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { 
  FaPaperPlane, 
  FaRobot, 
  FaUser, 
  FaSpinner, 
  FaTimes, 
  FaCommentDots, 
  FaExpand, 
  FaCompress,
  FaBroom 
} from 'react-icons/fa';
import aiService from '@/services/aiService';
import '@/assets/scss/components/chat/_chat-ai-popup.scss';

const ChatAIPopup = () => {
  const { user } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const popupRef = useRef(null);

  const initialMessage = useCallback(() => {
    return {
      sender: 'ai',
      text: `Chào ${user.username}, Trợ lý AI Rạp Rê có thể giúp gì cho bạn không?`,
      timestamp: new Date().toISOString(),
    };
  }, [user?.username]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && user?.username && messages.length === 0) {
      setMessages([initialMessage()]);
    }
  }, [isOpen, user?.username, messages.length, initialMessage]);

  const togglePopup = useCallback(() => {
    setIsOpen(prev => !prev);
    if (isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleSendMessage = useCallback(async (messageText) => {
    const text = (typeof messageText === 'string' ? messageText : inputMessage).trim();
    if (!text || isLoading) return;

    const newMessage = {
      sender: 'user',
      text: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);
    if (typeof messageText !== 'string') {
      setInputMessage('');
    }
    setIsLoading(true);

    try {
      const response = await aiService.chatWithAI(text);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          sender: 'ai',
          text: response.data.response,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Lỗi khi gửi tin nhắn đến AI:', error);
      toast.error('Có lỗi xảy ra khi trò chuyện với AI.');
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          sender: 'ai',
          text: 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn vào lúc này. Vui lòng thử lại sau.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, isLoading]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleClearChat = () => {
    setMessages([initialMessage()]);
    toast.info('Lịch sử trò chuyện đã được xóa.');
  };

  const SuggestedPrompts = () => {
    if (messages.length > 1) return null;
    const prompts = [
      "Gợi ý một bộ phim hay?",
      "Phim hành động nào đang hot?"
    ];
    return (
      <div className="suggested-prompts">
        {prompts.map((prompt, index) => (
          <button key={index} onClick={() => handleSendMessage(prompt)} className="prompt-button">
            {prompt}
          </button>
        ))}
      </div>
    );
  };

  if (!user) return null;

  return (
    <>
      {!isOpen && (
        <button className="chat-ai-toggle-button" onClick={togglePopup} aria-label="Mở Trợ lý AI">
          <FaCommentDots />
        </button>
      )}

      {isOpen && (
        <div className="chat-ai-popup-overlay" onClick={togglePopup}>
          <div 
            ref={popupRef} 
            className={`chat-ai-popup-container ${isExpanded ? 'expanded' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="chat-ai-popup-header">
              <div className="header-left">
                <FaRobot className="chat-ai-icon" />
                <h2>Trợ lý AI Rạp Rê</h2>
              </div>
              <div className="header-right">
                <button className="header-button" onClick={handleClearChat} aria-label="Xóa cuộc trò chuyện">
                  <FaBroom />
                </button>
                <button className="header-button" onClick={toggleExpand} aria-label={isExpanded ? 'Thu nhỏ' : 'Phóng to'}>
                  {isExpanded ? <FaCompress /> : <FaExpand />}
                </button>
                <button className="header-button" onClick={togglePopup} aria-label="Đóng">
                  <FaTimes />
                </button>
              </div>
            </div>
            <div className="chat-ai-popup-messages">
              {messages.map((msg, index) => (
                <div key={index} className={`message-bubble ${msg.sender}`}>
                  <div className="avatar-icon">
                    {msg.sender === 'ai' ? <FaRobot /> : <FaUser />}
                  </div>
                  <div className="message-content">
                    <p>{msg.text}</p>
                    <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message-bubble ai loading">
                  <div className="avatar-icon"><FaRobot /></div>
                  <div className="message-content">
                    <FaSpinner className="loading-spinner" />
                    <span>AI đang suy nghĩ...</span>
                  </div>
                </div>
              )}
              <SuggestedPrompts />
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-ai-popup-input-form" onSubmit={handleFormSubmit}>
              <div className="chat-input-wrapper">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Hỏi Trợ lý AI Rạp Rê..."
                  disabled={isLoading}
                  aria-label="Nhập tin nhắn"
                />
              </div>
              <button type="submit" className="send-button" disabled={isLoading || !inputMessage.trim()} aria-label="Gửi tin nhắn">
                <FaPaperPlane />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAIPopup;

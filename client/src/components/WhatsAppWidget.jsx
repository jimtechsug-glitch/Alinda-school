import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { API } from '../App';

const QUICK_REPLIES = [
  { label: '👋 Hello', query: 'hello' },
  { label: '💰 Fees', query: 'fees' },
  { label: '📋 Admission', query: 'admission' },
  { label: '📞 Contact', query: 'contact' },
  { label: '📚 Subjects', query: 'subjects' },
];

const ADMIN_WHATSAPP = '256757906118';

export default function WhatsAppWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Gyebaleko! 🎓 Welcome to Alinda Digital Learners. How can I help you today?", incoming: true }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (query) => {
    const text = query || input.trim();
    if (!text) return;

    setMessages(prev => [...prev, { text, incoming: false }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/chatbot?query=${encodeURIComponent(text)}`);
      const data = await res.json();
      setMessages(prev => [...prev, { text: data.reply || 'Sorry, I could not process that.', incoming: true }]);
    } catch {
      setMessages(prev => [...prev, {
        text: "Connection issue. Please contact us directly on WhatsApp by clicking the button below.",
        incoming: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    const lastMsg = messages[messages.length - 1];
    const msgText = encodeURIComponent(`Hello Alinda Digital Learners, I need assistance.`);
    window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${msgText}`, '_blank');
  };

  return (
    <>
      {/* Chat Drawer */}
      {open && (
        <div className="whatsapp-chat-drawer">
          {/* Header */}
          <div className="whatsapp-drawer-header">
            <div className="whatsapp-avatar-status">
              <div className="whatsapp-avatar">A</div>
              <div className="whatsapp-status-dot"></div>
            </div>
            <div className="whatsapp-header-info">
              <div className="whatsapp-header-title">Alinda Support</div>
              <div className="whatsapp-header-desc">AutoChatbot • Usually replies instantly</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="whatsapp-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`whatsapp-msg ${msg.incoming ? 'incoming' : 'outgoing'}`}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="whatsapp-msg incoming" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{ animation: 'pulse 1s infinite', fontSize: '1.5rem' }}>•••</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          <div className="whatsapp-quick-replies">
            {QUICK_REPLIES.map(qr => (
              <button key={qr.query} className="quick-reply-btn" onClick={() => sendMessage(qr.query)}>
                {qr.label}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div className="whatsapp-input-area">
            <input
              className="input-field"
              style={{ flexGrow: 1, padding: '8px 14px', fontSize: '0.9rem' }}
              placeholder="Type a message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button className="btn btn-primary btn-sm" onClick={() => sendMessage()}>
              <Send size={16} />
            </button>
          </div>

          {/* Open real WhatsApp */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', gap: '8px', color: '#25D366', borderColor: '#25D366' }}
              onClick={openWhatsApp}
            >
              <MessageCircle size={15} /> Chat with us on WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Floating Bubble */}
      <button
        className="whatsapp-floating-bubble"
        onClick={() => setOpen(prev => !prev)}
        title="Chat with Alinda Support"
        aria-label="Open WhatsApp chat"
      >
        {open ? <X size={26} /> : <MessageCircle size={26} />}
      </button>
    </>
  );
}

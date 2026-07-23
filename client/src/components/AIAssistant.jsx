import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Send, Search, RotateCcw, Globe, ExternalLink,
  GraduationCap, Zap, ChevronRight, Award, Sparkles,
  BookOpen, FlaskConical, Calculator, History,
  Microscope, Languages, Landmark, Cpu, Leaf, Book
} from "lucide-react";
import { API, useAuth } from "../App";

/* ──────────────────────────────────────────────
   LEVEL CONFIG
────────────────────────────────────────────── */
const LEVELS = {
  primary: {
    label: "Primary (PLE)", exam: "PLE",
    color: "#10b981", grd: "linear-gradient(135deg,#10b981,#059669)",
    subjects: [
      { name: "Mathematics", icon: <Calculator size={14}/>, prompt: "Explain this Mathematics topic for Uganda PLE: " },
      { name: "English",     icon: <Languages size={14}/>,  prompt: "Explain this English topic for Uganda PLE: " },
      { name: "Science",     icon: <Microscope size={14}/>, prompt: "Explain this Science topic for Uganda PLE: " },
      { name: "Social Studies", icon: <Globe size={14}/>,   prompt: "Explain this Social Studies topic for Uganda PLE: " },
      { name: "CRE",         icon: <Book size={14}/>,       prompt: "Explain this CRE topic for Uganda PLE: " },
    ],
    quickTopics: [
      "What are the parts of a flower and their functions?",
      "Explain the water cycle step by step",
      "How do we add and subtract fractions?",
      "What are the organs of the human body?",
      "Describe Uganda's major physical features",
      "What causes soil erosion and how can it be prevented?",
      "Explain the life cycle of a butterfly",
      "What are the duties of a good citizen in Uganda?",
    ]
  },
  olevel: {
    label: "O-Level (UCE)", exam: "UCE",
    color: "#6366f1", grd: "linear-gradient(135deg,#6366f1,#4f46e5)",
    subjects: [
      { name: "Mathematics", icon: <Calculator size={14}/>,    prompt: "Explain this O-Level Maths topic for Uganda UCE: " },
      { name: "Physics",     icon: <Zap size={14}/>,           prompt: "Explain this O-Level Physics topic for Uganda UCE: " },
      { name: "Chemistry",   icon: <FlaskConical size={14}/>,  prompt: "Explain this O-Level Chemistry topic for Uganda UCE: " },
      { name: "Biology",     icon: <Microscope size={14}/>,    prompt: "Explain this O-Level Biology topic for Uganda UCE: " },
      { name: "Geography",   icon: <Globe size={14}/>,         prompt: "Explain this O-Level Geography topic for Uganda UCE: " },
      { name: "History",     icon: <History size={14}/>,       prompt: "Explain this O-Level History topic for Uganda UCE: " },
      { name: "English",     icon: <Languages size={14}/>,     prompt: "Explain this O-Level English topic for Uganda UCE: " },
      { name: "Economics",   icon: <Landmark size={14}/>,      prompt: "Explain this O-Level Economics topic for Uganda UCE: " },
      { name: "Computer Sc.",icon: <Cpu size={14}/>,           prompt: "Explain this O-Level Computer Studies topic for Uganda UCE: " },
      { name: "Agriculture", icon: <Leaf size={14}/>,          prompt: "Explain this O-Level Agriculture topic for Uganda UCE: " },
    ],
    quickTopics: [
      "Explain Newton's three laws of motion with examples",
      "How does photosynthesis work? Give the equation",
      "What were the causes of the First World War?",
      "Explain ionic and covalent chemical bonding",
      "How do I solve simultaneous equations by substitution?",
      "What are the effects of deforestation in Uganda?",
      "Explain the human circulatory system and blood groups",
      "What are UNEB UCE marking scheme tips for Biology?",
      "Explain supply and demand with Uganda examples",
      "How do I write a good O-Level History essay?",
    ]
  },
  alevel: {
    label: "A-Level (UACE)", exam: "UACE",
    color: "#f59e0b", grd: "linear-gradient(135deg,#f59e0b,#d97706)",
    subjects: [
      { name: "Pure Maths",  icon: <Calculator size={14}/>,    prompt: "Explain this A-Level Pure Mathematics topic for Uganda UACE: " },
      { name: "Physics",     icon: <Zap size={14}/>,           prompt: "Explain this A-Level Physics topic for Uganda UACE: " },
      { name: "Chemistry",   icon: <FlaskConical size={14}/>,  prompt: "Explain this A-Level Chemistry topic for Uganda UACE: " },
      { name: "Biology",     icon: <Microscope size={14}/>,    prompt: "Explain this A-Level Biology topic for Uganda UACE: " },
      { name: "Economics",   icon: <Landmark size={14}/>,      prompt: "Explain this A-Level Economics topic for Uganda UACE: " },
      { name: "Computer Sc.",icon: <Cpu size={14}/>,           prompt: "Explain this A-Level Computer Science topic for Uganda UACE: " },
      { name: "Geography",   icon: <Globe size={14}/>,         prompt: "Explain this A-Level Geography topic for Uganda UACE: " },
      { name: "History",     icon: <History size={14}/>,       prompt: "Explain this A-Level History topic for Uganda UACE: " },
    ],
    quickTopics: [
      "Explain integration by parts with full worked examples",
      "What is quantum mechanics and the photoelectric effect?",
      "Explain the Haber process for industrial ammonia production",
      "Explain DNA replication and protein synthesis at A-Level",
      "How do I write a UACE History essay that scores grade A?",
      "Explain electromagnetic induction with derivations",
      "What is the theory of perfect competition in economics?",
      "Explain Le Chatelier's principle with examples",
    ]
  }
};

function detectLevel(level) {
  if (!level) return "olevel";
  const l = level.toLowerCase();
  if (l.startsWith("p") || l.includes("primary")) return "primary";
  if (l.startsWith("s5") || l.startsWith("s6") || l.includes("a-level") || l.includes("alevel")) return "alevel";
  return "olevel";
}

/* ──────────────────────────────────────────────
   MARKDOWN RENDERER
────────────────────────────────────────────── */
function renderMarkdown(text) {
  if (!text) return "";
  const lines = text.split("\n");
  let html = "";
  let inUL = false, inOL = false;

  const closeList = () => {
    if (inUL) { html += "</ul>"; inUL = false; }
    if (inOL) { html += "</ol>"; inOL = false; }
  };

  const inline = t => t
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="rmd-a">$1 ↗</a>')
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, '<code class="rmd-code">$1</code>');

  lines.forEach(raw => {
    const line = raw.trimEnd();
    if (!line.trim()) { closeList(); return; }
    if (/^---+$/.test(line.trim())) { closeList(); html += '<hr class="rmd-hr"/>'; return; }

    if (/^## (.+)/.test(line)) {
      closeList();
      const title = line.replace(/^## /, "");
      // Style special sections differently
      if (/key points|remember/i.test(title)) {
        html += `<div class="rmd-section rmd-section-key"><h3 class="rmd-h3-key">${inline(title)}</h3>`;
        html += `</div>`;
        html += `<div class="rmd-section-body-key">`;
      } else if (/exam tip|uneb|ple|uce|uace/i.test(title)) {
        html += `<div class="rmd-section rmd-section-exam"><h3 class="rmd-h3-exam">${inline(title)}</h3>`;
        html += `</div>`;
        html += `<div class="rmd-section-body-exam">`;
      } else if (/worked example|case study|example/i.test(title)) {
        html += `<div class="rmd-section rmd-section-eg"><h3 class="rmd-h3-eg">${inline(title)}</h3>`;
        html += `</div>`;
        html += `<div class="rmd-section-body-eg">`;
      } else {
        html += `<div class="rmd-section-end"></div><h2 class="rmd-h2">${inline(title)}</h2>`;
      }
      return;
    }
    if (/^### (.+)/.test(line)) {
      closeList();
      html += `<h3 class="rmd-h3">${inline(line.replace(/^### /, ""))}</h3>`;
      return;
    }
    if (/^#### (.+)/.test(line)) {
      closeList();
      html += `<h4 class="rmd-h4">${inline(line.replace(/^#### /, ""))}</h4>`;
      return;
    }

    const olM = line.match(/^(\d+)\.\s+(.*)/);
    if (olM) {
      if (inUL) { html += "</ul>"; inUL = false; }
      if (!inOL) { html += '<ol class="rmd-ol">'; inOL = true; }
      html += `<li>${inline(olM[2])}</li>`;
      return;
    }

    const ulM = line.match(/^[-•*]\s+(.*)/);
    if (ulM) {
      if (inOL) { html += "</ol>"; inOL = false; }
      if (!inUL) { html += '<ul class="rmd-ul">'; inUL = true; }
      html += `<li>${inline(ulM[1])}</li>`;
      return;
    }

    closeList();
    if (line.trim()) html += `<p class="rmd-p">${inline(line)}</p>`;
  });
  closeList();
  return html;
}

/* ──────────────────────────────────────────────
   AGENT BADGE
────────────────────────────────────────────── */
const AGENT_STYLES = {
  gemini:  { label: "Gemini AI", bg: "rgba(66,133,244,.15)", border: "rgba(66,133,244,.35)", color: "#7ab4ff", dot: "#4285f4" },
  openai:  { label: "ChatGPT",   bg: "rgba(16,185,129,.12)", border: "rgba(16,185,129,.35)", color: "#34d399", dot: "#10b981" },
  claude:  { label: "Claude",    bg: "rgba(245,158,11,.12)", border: "rgba(245,158,11,.35)", color: "#fbbf24", dot: "#f59e0b" },
  copilot: { label: "Copilot",   bg: "rgba(139,92,246,.12)", border: "rgba(139,92,246,.35)", color: "#c084fc", dot: "#8b5cf6" }
};

function AgentBadge({ agentIcon, agentName }) {
  const st = AGENT_STYLES[agentIcon] || AGENT_STYLES.gemini;
  return (
    <div className="aa-agent-badge" style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.color }}>
      <span className="aa-agent-dot" style={{ background: st.dot }}/>
      {st.label} · {agentName}
    </div>
  );
}

/* ──────────────────────────────────────────────
   WEB SOURCES
────────────────────────────────────────────── */
function WebSources({ sources, queries }) {
  if (!sources || !sources.length) return null;
  return (
    <div className="aa-wsrc">
      <div className="aa-wsrc-hdr">
        <Globe size={11}/>
        <span>Web Sources</span>
        {queries && queries[0] && <span className="aa-wsrc-q">— searched: <em>"{queries[0]}"</em></span>}
      </div>
      <div className="aa-wsrc-grid">
        {sources.map((s, i) => (
          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="aa-wsrc-card">
            <img src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=32`} alt="" width={13} height={13} onError={e => (e.target.style.display = "none")}/>
            <div className="aa-wsrc-info">
              <div className="aa-wsrc-title">{s.title}</div>
              <div className="aa-wsrc-dom">{s.domain}</div>
            </div>
            <ExternalLink size={9}/>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   TYPING ANIMATION
────────────────────────────────────────────── */
function Typing() {
  return (
    <span className="aa-typing">
      <span/><span/><span/>
    </span>
  );
}

/* ──────────────────────────────────────────────
   MAIN COMPONENT
────────────────────────────────────────────── */
export default function AIAssistant() {
  const { token, user } = useAuth();
  const lk  = detectLevel(user?.level);
  const cfg = LEVELS[lk];

  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [activeSub, setActiveSub] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState("auto");

  const bottomRef = useRef(null);
  const taRef     = useRef(null);
  const inputRef  = useRef(null);

  /* Welcome message */
  useEffect(() => {
    setMessages([{
      role: "assistant", isWelcome: true,
      text: `## 👋 Welcome to AutoAssistant AI\n\nHello **${user?.name?.split(" ")[0] || "Student"}**! I'm your **NCDC & UNEB academic research assistant** powered by multiple AI agents — Gemini, ChatGPT, and Claude working together.\n\nI know you are studying at **${cfg.label}** level and I will tailor every answer to the **Uganda NCDC curriculum** and **UNEB ${cfg.exam} examination** standards.\n\n**What I provide for every question:**\n- 📚 Detailed, comprehensive explanations\n- 🧮 Step-by-step worked examples\n- 📝 Key definitions and important terms\n- 📌 Key points to remember\n- 💡 UNEB Exam tips and marking scheme guidance\n\nChoose a subject from the sidebar or type your question below! 🚀`,
    }]);
  }, []);

  /* Auto scroll */
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  /* Auto-resize textarea */
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  /* Send */
  const ask = useCallback(async (override) => {
    const text = (override !== undefined ? override : input).trim();
    if (!text || loading) return;

    setMessages(p => [...p, { role: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/ai/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {})
        },
        body: JSON.stringify({ query: text, levelKey: lk, agent: selectedAgent })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages(p => [...p, {
        role:       "assistant",
        text:       data.answer || "No answer returned. Please try rephrasing.",
        agent:      data.agent,
        agentIcon:  data.agentIcon,
        level:      data.level,
        webSources: data.webSources || [],
        queries:    data.searchQueries || [],
        webGrounded: data.webGrounded || false
      }]);
    } catch (err) {
      setMessages(p => [...p, {
        role: "assistant",
        text: `## ⚠️ Error\n\nCould not reach the AutoAssistant server.\n\n**Details:** ${err.message}`,
        isError: true
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [input, loading, token, lk, selectedAgent]);

  const onKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } };

  const newChat = () => {
    setActiveSub(null); setActiveTopic(null);
    setMessages([{ role: "assistant",
      text: `## 🔄 New Research Session\n\nReady! Ask me anything from the **Uganda ${cfg.label} curriculum**. 📚`
    }]);
  };

  const clickSubject = (s, idx) => {
    setActiveSub(idx); setActiveTopic(null);
    const q = window.prompt(`Enter your ${s.name} question or topic:`);
    if (q && q.trim()) ask(s.prompt + q.trim());
  };

  const clickTopic = (t, idx) => {
    setActiveTopic(idx); setActiveSub(null);
    ask(t);
  };

  /* ── RENDER ── */
  return (
    <div className="aa-root">

      {/* ═══ HEADER ═══════════════════════════════════════════════════ */}
      <div className="aa-hdr">
        <div className="aa-hdr-l">
          <div className="aa-orb" style={{ background: cfg.grd }}>
            <Bot size={18} color="white"/>
            <div className="aa-orb-ring"/>
          </div>
          <div>
            <div className="aa-title">AutoAssistant AI</div>
            <div className="aa-subtitle">
              <span className="aa-lvl-pill" style={{ color: cfg.color, background: cfg.color + "1a", borderColor: cfg.color + "40" }}>
                🎓 {cfg.label} {user?.level ? `· ${user.level}` : ""}
              </span>
              <span className="aa-dot-live"/>
              <span className="aa-ncdc-tag">NCDC · UNEB {cfg.exam}</span>
            </div>
          </div>
        </div>
        <div className="aa-hdr-r">
          <div className="aa-agents-row">
            <button 
              className={`aa-agent-chip aa-chip-auto ${selectedAgent === "auto" ? "aa-chip-active" : ""}`}
              onClick={() => setSelectedAgent("auto")}
              title="Auto-select best available agent"
            >
              🔄 Auto-Select
            </button>
            <button 
              className={`aa-agent-chip aa-chip-gemini ${selectedAgent === "gemini" ? "aa-chip-active" : ""}`}
              onClick={() => setSelectedAgent("gemini")}
              title="Use Google Search grounded Gemini 2.5"
            >
              ✨ Gemini
            </button>
            <button 
              className={`aa-agent-chip aa-chip-gpt ${selectedAgent === "openai" ? "aa-chip-active" : ""}`}
              onClick={() => setSelectedAgent("openai")}
              title="Use OpenAI GPT-4o / GPT-3.5"
            >
              🤖 ChatGPT
            </button>
            <button 
              className={`aa-agent-chip aa-chip-claude ${selectedAgent === "claude" ? "aa-chip-active" : ""}`}
              onClick={() => setSelectedAgent("claude")}
              title="Use Anthropic Claude 3"
            >
              ⚡ Claude
            </button>
            <button 
              className={`aa-agent-chip aa-chip-copilot ${selectedAgent === "copilot" ? "aa-chip-active" : ""}`}
              onClick={() => setSelectedAgent("copilot")}
              title="Use Bing Search grounded Copilot"
            >
              🚀 Copilot
            </button>
          </div>
          <button className="aa-new-btn" onClick={newChat}>
            <RotateCcw size={12}/> New Chat
          </button>
        </div>
      </div>

      {/* ═══ BODY ═════════════════════════════════════════════════════ */}
      <div className="aa-body">

        {/* ─── SIDEBAR ─── */}
        <aside className="aa-sidebar">
          <div className="aa-sb-label"><GraduationCap size={12}/> {cfg.exam} Subjects</div>
          <nav className="aa-sb-nav">
            {cfg.subjects.map((s, i) => (
              <button
                key={i}
                className={"aa-sb-item" + (activeSub === i ? " aa-sb-active" : "")}
                style={activeSub === i ? { borderColor: cfg.color, background: cfg.color + "15", color: cfg.color } : {}}
                onClick={() => clickSubject(s, i)}
              >
                <span className="aa-sb-icon">{s.icon}</span>
                <span className="aa-sb-name">{s.name}</span>
                <ChevronRight size={10} className="aa-sb-arr"/>
              </button>
            ))}
          </nav>

          <div className="aa-divider"/>

          <div className="aa-sb-label"><Zap size={12}/> Quick Topics</div>
          <div className="aa-topics">
            {cfg.quickTopics.map((t, i) => (
              <button
                key={i}
                className={"aa-topic" + (activeTopic === i ? " aa-topic-active" : "")}
                onClick={() => clickTopic(t, i)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="aa-sb-tip">
            <Award size={11}/>
            <span>Powered by <strong>Gemini · GPT-4o · Claude</strong> — aligned to <strong>NCDC & UNEB {cfg.exam}</strong></span>
          </div>
        </aside>

        {/* ─── CHAT ─── */}
        <div className="aa-chat">
          <div className="aa-msgs">
            {messages.map((msg, i) => (
              <div key={i} className={`aa-row aa-${msg.role}`}>
                {msg.role === "assistant" && (
                  <div className="aa-ai-av" style={{ background: msg.isError ? "#f43f5e22" : cfg.grd }}>
                    <Bot size={13} color="white"/>
                  </div>
                )}
                <div className={`aa-bub aa-bub-${msg.role}${msg.isWelcome ? " aa-bub-welcome" : ""}${msg.isError ? " aa-bub-error" : ""}`}>
                  {msg.role === "assistant" ? (
                    <>
                      <div className="aa-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}/>
                      {msg.agent && (
                        <div className="aa-meta">
                          <AgentBadge agentIcon={msg.agentIcon} agentName={msg.agent}/>
                          {msg.webGrounded && <span className="aa-web-badge">🌐 Web Search</span>}
                          {msg.level && <span className="aa-lvl-badge">📚 {msg.level}</span>}
                        </div>
                      )}
                      <WebSources sources={msg.webSources} queries={msg.queries}/>
                    </>
                  ) : (
                    <div className="aa-user-text">{msg.text}</div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="aa-user-av">
                    {user?.photoData
                      ? <img src={user.photoData} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}/>
                      : user?.name?.charAt(0)?.toUpperCase() || "S"
                    }
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="aa-row aa-assistant">
                <div className="aa-ai-av" style={{ background: cfg.grd }}><Bot size={13} color="white"/></div>
                <div className="aa-bub aa-bub-assistant aa-bub-loading">
                  <div className="aa-loading-txt">
                    <Sparkles size={12} style={{ animation: "aa-spin 1.2s linear infinite" }}/>
                    Researching Uganda {cfg.exam} curriculum with AI agents...
                  </div>
                  <Typing/>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="aa-input-wrap">
            <div className="aa-input-box">
              <Search size={15} className="aa-input-ico"/>
              <textarea
                ref={el => { taRef.current = el; inputRef.current = el; }}
                className="aa-ta"
                rows={1}
                placeholder={`Search any ${cfg.label} topic... (Enter to send · Shift+Enter for new line)`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
              />
              <button
                className={"aa-send" + (input.trim() && !loading ? " aa-send-active" : "")}
                onClick={() => ask()}
                disabled={!input.trim() || loading}
                title="Send"
              >
                {loading ? <Sparkles size={15} style={{ animation: "aa-spin .8s linear infinite" }}/> : <Send size={15}/>}
              </button>
            </div>
            <div className="aa-hint">
              Results aligned to <strong>Uganda NCDC</strong> &amp; <strong>UNEB {cfg.exam}</strong> · Multi-agent AI: Gemini · ChatGPT · Claude
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

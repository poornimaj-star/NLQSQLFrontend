import React, { useState, useEffect } from "react";
import axios from "axios";

interface Conversation {
  session_id: string;
  messages: Array<{
    id: number;
    ts: string;
    role: string;
    content: string;
    sql_query?: string;
  }>;
}

interface QueryResult {
  answer: string;
  sql: string;
  data: {
    columns: string[];
    rows: any[];
  };
  session_id?: string;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
  db_url: string;
  trained_at?: string;
}

interface Favorite {
  id: number;
  name: string;
  created_at?: string;
}

interface Database {
  name: string;
  schema: string;
}

interface ChatProps {
  selectedAgent?: Agent | null;
  onAgentChange?: (agent: Agent | null) => void;
}

const Chat: React.FC<ChatProps> = ({ selectedAgent, onAgentChange }) => {
  const USER_ID = "demo-user-123";
  
  // App state flow
  const [appState, setAppState] = useState<"initial" | "agent-selection" | "new-connection" | "connected">("initial");
  
  // Database connection states
  const [dbType, setDbType] = useState("postgresql");
  const [host, setHost] = useState("");
  const [dbName, setDbName] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [port, setPort] = useState("5432");
  const [connected, setConnected] = useState(false);
  const [selectedAgentState, setSelectedAgent] = useState<Agent | null>(null);
  const [connectionMsg, setConnectionMsg] = useState("");
  
  // Use props or local state for selectedAgent
  const currentSelectedAgent = selectedAgent || selectedAgentState;
  
  // Available agents
  const [agents, setAgents] = useState<Agent[]>([]);
  
  // Chat states
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationIndex, setCurrentConversationIndex] = useState(-1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Training states
  const [trainRunId, setTrainRunId] = useState<string | null>(null);
  const [trainStatus, setTrainStatus] = useState("");
  
  // Feedback states
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // Edit SQL states
  const [editedSQL, setEditedSQL] = useState("");
  const [isEditingSQL, setIsEditingSQL] = useState(false);
  const [isQuestionEditable, setIsQuestionEditable] = useState(true);
  
  // Favorites states
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favMessage, setFavMessage] = useState<string | null>(null);
  const [favSubmitting, setFavSubmitting] = useState(false);
  
  // Database dropdown states
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
  const [showDatabaseDropdown, setShowDatabaseDropdown] = useState(false);

  // Effect to set up initial agent state
  useEffect(() => {
    if (currentSelectedAgent) {
      setConnected(true);
      setAppState("connected");
      loadDatabasesList();
    }
  }, [currentSelectedAgent]);

  // Load databases for selected agent
  const loadDatabasesList = async () => {
    if (!currentSelectedAgent) return;
    
    try {
      // Mock database data for demonstration
      const mockDatabases: Database[] = [
        { name: "ecommerce_db", schema: "public" },
        { name: "analytics_db", schema: "public" },
        { name: "user_management", schema: "public" },
        { name: "inventory_db", schema: "public" }
      ];
      
      setDatabases(mockDatabases);
      if (mockDatabases.length > 0) {
        setSelectedDatabase(mockDatabases[0]);
      }
    } catch (error) {
      console.error("Error loading databases:", error);
      setDatabases([]);
    }
  };

  // Submit question
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !currentSelectedAgent) return;

    setLoading(true);
    setResponse(null);
    setFeedback(null);

    try {
      const res = await axios.post("http://localhost:5000/api/chat", {
        question: question.trim(),
        agent_id: currentSelectedAgent.id,
        user_id: USER_ID,
        session_id: sessionId,
        database: selectedDatabase?.name || ""
      });

      if (res.data?.answer) {
        const result: QueryResult = {
          answer: res.data.answer,
          sql: res.data.sql || "",
          data: res.data.data || { columns: [], rows: [] },
          session_id: res.data.session_id
        };
        
        setResponse(result);
        setEditedSQL(result.sql);
        setIsEditingSQL(false);
        setIsQuestionEditable(false);
        
        if (result.session_id) {
          setSessionId(result.session_id);
        }
        
        await loadConversations();
      }
    } catch (error: any) {
      console.error("Error:", error);
      setResponse({
        answer: `Error: ${error?.response?.data?.error || error?.message || "Unknown error"}`,
        sql: "",
        data: { columns: [], rows: [] }
      });
    } finally {
      setLoading(false);
    }
  };

  // Load conversations
  const loadConversations = async () => {
    if (!currentSelectedAgent) return;
    
    try {
      const res = await axios.get(`http://localhost:5000/api/conversations/${currentSelectedAgent.id}/${USER_ID}`);
      if (res.data?.conversations) {
        setConversations(res.data.conversations);
        setCurrentConversationIndex(-1);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  // Load available agents
  const loadAgents = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/agents");
      if (res.data?.agents) {
        setAgents(res.data.agents);
      }
    } catch (error) {
      console.error("Error loading agents:", error);
    }
  };

  // Handle agent selection
  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    if (onAgentChange) {
      onAgentChange(agent);
    }
    setConnected(true);
    setAppState("connected");
    setResponse(null);
    setQuestion("");
    loadDatabasesList();
  };

  // Reset to new conversation
  const handleReset = () => {
    setQuestion("");
    setResponse(null);
    setFeedback(null);
    setCurrentConversationIndex(-1);
    setSessionId(null);
    setEditedSQL("");
    setIsEditingSQL(false);
    setIsQuestionEditable(true);
  };

  // Navigation functions
  const navigateToPrevious = () => {
    if (currentConversationIndex < conversations.length - 1) {
      const newIndex = currentConversationIndex + 1;
      setCurrentConversationIndex(newIndex);
      loadConversationData(newIndex);
    }
  };

  const navigateToNext = () => {
    if (currentConversationIndex > 0) {
      const newIndex = currentConversationIndex - 1;
      setCurrentConversationIndex(newIndex);
      loadConversationData(newIndex);
    } else if (currentConversationIndex === 0) {
      setCurrentConversationIndex(-1);
      setResponse(null);
    }
  };

  const loadConversationData = (index: number) => {
    if (index >= 0 && index < conversations.length) {
      const conversation = conversations[index];
      const userMessage = conversation.messages.find((m: any) => m.role === "user");
      const assistantMessage = conversation.messages.find((m: any) => m.role === "assistant");

      if (userMessage && assistantMessage) {
        setResponse({
          answer: assistantMessage.content,
          sql: assistantMessage.sql_query || "",
          data: { columns: [], rows: [] }
        });
        setQuestion(userMessage.content);
        setEditedSQL(assistantMessage.sql_query || "");
      }
    }
  };

  // Database dropdown component
  const DatabaseDropdown = () => (
    <div style={{ position: "relative", marginBottom: "10px" }}>
      <button
        onClick={() => setShowDatabaseDropdown(!showDatabaseDropdown)}
        style={{
          width: "100%",
          padding: "8px 12px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "white",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <span>{selectedDatabase ? selectedDatabase.name : "Select Database"}</span>
        <span>{showDatabaseDropdown ? "▲" : "▼"}</span>
      </button>
      
      {showDatabaseDropdown && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          backgroundColor: "white",
          border: "1px solid #ddd",
          borderTop: "none",
          borderRadius: "0 0 4px 4px",
          maxHeight: "200px",
          overflowY: "auto",
          zIndex: 1000
        }}>
          {databases.map((db) => (
            <div
              key={db.name}
              onClick={() => {
                setSelectedDatabase(db);
                setShowDatabaseDropdown(false);
              }}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                backgroundColor: selectedDatabase?.name === db.name ? "#f0f0f0" : "white"
              }}
              onMouseEnter={(e) => {
                if (selectedDatabase?.name !== db.name) {
                  (e.target as HTMLElement).style.backgroundColor = "#f8f8f8";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedDatabase?.name !== db.name) {
                  (e.target as HTMLElement).style.backgroundColor = "white";
                }
              }}
            >
              {db.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render initial screen
  if (appState === "initial") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif"
      }}>
        <div style={{
          backgroundColor: "white",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          textAlign: "center",
          maxWidth: "400px",
          width: "100%"
        }}>
          <h1 style={{ color: "#333", marginBottom: "30px" }}>Natural Language to SQL</h1>
          <p style={{ color: "#666", marginBottom: "30px", lineHeight: "1.5" }}>
            Transform your questions into SQL queries using AI
          </p>
          <button
            onClick={() => { setAppState("agent-selection"); loadAgents(); }}
            style={{
              width: "100%",
              padding: "12px 24px",
              backgroundColor: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              cursor: "pointer",
              marginBottom: "10px"
            }}
          >
            Connect to Agent
          </button>
          <button
            onClick={() => setAppState("new-connection")}
            style={{
              width: "100%",
              padding: "12px 24px",
              backgroundColor: "transparent",
              color: "#667eea",
              border: "2px solid #667eea",
              borderRadius: "6px",
              fontSize: "16px",
              cursor: "pointer"
            }}
          >
            Create New Connection
          </button>
        </div>
      </div>
    );
  }

  // Render agent selection screen
  if (appState === "agent-selection") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px"
      }}>
        <div style={{
          maxWidth: "800px",
          margin: "0 auto",
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "30px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
        }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "30px" }}>
            <button
              onClick={() => setAppState("initial")}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f5f5f5",
                border: "1px solid #ddd",
                borderRadius: "6px",
                cursor: "pointer",
                marginRight: "20px"
              }}
            >
              ← Back
            </button>
            <h2 style={{ color: "#333", margin: 0 }}>Select an Agent</h2>
          </div>

          {agents.length === 0 ? (
            <p style={{ color: "#666", textAlign: "center", padding: "40px" }}>
              No agents available. Create a new connection to train an agent.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "15px" }}>
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => handleAgentSelect(agent)}
                  style={{
                    padding: "20px",
                    border: "2px solid #e0e0e0",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "#667eea";
                    (e.currentTarget as HTMLElement).style.backgroundColor = "#f8f9ff";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "#e0e0e0";
                    (e.currentTarget as HTMLElement).style.backgroundColor = "white";
                  }}
                >
                  <h3 style={{ color: "#333", margin: "0 0 10px 0" }}>{agent.name}</h3>
                  <p style={{ color: "#666", margin: "0 0 10px 0" }}>
                    {agent.description || "No description available"}
                  </p>
                  <div style={{ fontSize: "12px", color: "#999" }}>
                    <div>Agent ID: {agent.id}</div>
                    {agent.trained_at && <div>Trained: {agent.trained_at}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Connected state - show chat interface
  if (appState === "connected" && currentSelectedAgent) {
    return (
      <div style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        fontFamily: "Arial, sans-serif"
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: "white",
          padding: "15px 20px",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <h2 style={{ color: "#333", margin: 0 }}>
              Chat with {currentSelectedAgent.name}
            </h2>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleReset}
              style={{
                padding: "8px 16px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              New Chat
            </button>
            <button
              onClick={() => setAppState("agent-selection")}
              style={{
                padding: "8px 16px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Switch Agent
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "20px",
          display: "grid",
          gap: "20px"
        }}>
          {/* Database Selection */}
          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Database Selection</h3>
            <DatabaseDropdown />
          </div>

          {/* Chat Form */}
          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
          }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "15px" }}>
                <label style={{
                  display: "block",
                  marginBottom: "5px",
                  fontWeight: "bold",
                  color: "#333"
                }}>
                  Your Question:
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about your data..."
                  disabled={!isQuestionEditable}
                  style={{
                    width: "100%",
                    minHeight: "80px",
                    padding: "10px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "14px",
                    resize: "vertical"
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !question.trim()}
                style={{
                  padding: "10px 20px",
                  backgroundColor: loading ? "#ccc" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "14px"
                }}
              >
                {loading ? "Processing..." : "Ask Question"}
              </button>
            </form>
          </div>

          {/* Response Display */}
          {response && (
            <div style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Response</h3>
              
              {/* Answer */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ color: "#333", marginBottom: "10px" }}>Answer:</h4>
                <div style={{
                  padding: "15px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "4px",
                  border: "1px solid #e9ecef"
                }}>
                  {response.answer}
                </div>
              </div>

              {/* SQL Query */}
              {response.sql && (
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ color: "#333", marginBottom: "10px" }}>Generated SQL:</h4>
                  <pre style={{
                    padding: "15px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "4px",
                    border: "1px solid #e9ecef",
                    fontSize: "12px",
                    whiteSpace: "pre-wrap",
                    overflow: "auto"
                  }}>
                    {response.sql}
                  </pre>
                </div>
              )}

              {/* Data Table */}
              {response.data && response.data.columns && response.data.columns.length > 0 && (
                <div>
                  <h4 style={{ color: "#333", marginBottom: "10px" }}>Results:</h4>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      border: "1px solid #ddd"
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8f9fa" }}>
                          {response.data.columns.map((col, index) => (
                            <th key={index} style={{
                              padding: "8px 12px",
                              border: "1px solid #ddd",
                              textAlign: "left",
                              fontWeight: "bold"
                            }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {response.data.rows.slice(0, 20).map((row, rowIndex) => (
                          <tr key={rowIndex}>
                            {response.data.columns.map((col, colIndex) => (
                              <td key={colIndex} style={{
                                padding: "8px 12px",
                                border: "1px solid #ddd"
                              }}>
                                {row[col] !== null && row[col] !== undefined ? String(row[col]) : ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {response.data.rows.length > 20 && (
                      <p style={{ color: "#666", fontSize: "12px", marginTop: "10px" }}>
                        Showing first 20 rows of {response.data.rows.length} total rows
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback to initial state
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <p>Loading...</p>
    </div>
  );
};

export default Chat;
import React, { useState, useEffect, useContext, createContext } from "react";
import "@/App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('session_token'));

  useEffect(() => {
    const checkAuth = async () => {
      if (sessionToken) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${sessionToken}` }
          });
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('session_token');
          setSessionToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [sessionToken]);

  const login = () => {
    window.location.href = `${API}/auth/google`;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('session_token');
    setSessionToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, sessionToken }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Landing Page Component
const LandingPage = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
              </div>
              <h1 className="ml-3 text-2xl font-bold text-gray-900">JobSeeker AI</h1>
            </div>
            <button
              onClick={login}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Automatiza tu búsqueda laboral con
            <span className="text-blue-600"> Inteligencia Artificial</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Genera cartas de presentación personalizadas, organiza tus postulaciones 
            y mantén el control de tu proceso de búsqueda laboral en un solo lugar.
          </p>
          <button
            onClick={login}
            className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105"
          >
            Comenzar Gratis
          </button>
        </div>

        {/* Features Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Documentos con IA</h3>
            <p className="text-gray-600">
              Genera cartas de presentación y mensajes personalizados adaptados a cada oferta laboral.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Seguimiento Visual</h3>
            <p className="text-gray-600">
              Organiza tus postulaciones en un tablero kanban intuitivo y mantén el control de todo el proceso.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Analíticas Inteligentes</h3>
            <p className="text-gray-600">
              Obtén insights sobre tu tasa de respuesta y optimiza tu estrategia de búsqueda laboral.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-20 bg-white rounded-2xl p-8 shadow-sm">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Resultados que Importan</h3>
            <p className="text-gray-600">Nuestra plataforma ayuda a profesionales a conseguir mejores resultados</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">70%</div>
              <div className="text-gray-600">Reducción en tiempo por postulación</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">2x</div>
              <div className="text-gray-600">Mayor tasa de respuesta</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-600 mb-2">2min</div>
              <div className="text-gray-600">Para completar tu perfil</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user, logout, sessionToken } = useAuth();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [documents, setDocuments] = useState([]);

  const statusColumns = [
    { key: 'interested', title: 'Interesado', color: 'bg-gray-100', textColor: 'text-gray-700' },
    { key: 'applied', title: 'Aplicado', color: 'bg-blue-100', textColor: 'text-blue-700' },
    { key: 'interview', title: 'Entrevista', color: 'bg-yellow-100', textColor: 'text-yellow-700' },
    { key: 'offer', title: 'Oferta', color: 'bg-green-100', textColor: 'text-green-700' },
    { key: 'rejected', title: 'Rechazado', color: 'bg-red-100', textColor: 'text-red-700' },
    { key: 'ghosted', title: 'Sin respuesta', color: 'bg-purple-100', textColor: 'text-purple-700' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appsResponse, statsResponse] = await Promise.all([
        axios.get(`${API}/applications`, {
          headers: { Authorization: `Bearer ${sessionToken}` }
        }),
        axios.get(`${API}/stats`, {
          headers: { Authorization: `Bearer ${sessionToken}` }
        })
      ]);
      
      setApplications(appsResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (appId, newStatus) => {
    try {
      await axios.put(`${API}/applications/${appId}`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${sessionToken}` } }
      );
      loadData();
    } catch (error) {
      console.error('Error updating application:', error);
    }
  };

  const generateDocument = async (appId, type, tone = 'professional') => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/documents/generate`, {
        application_id: appId,
        type: type,
        tone: tone
      }, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      
      // Load documents for this application
      const docsResponse = await axios.get(`${API}/documents/${appId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      setDocuments(docsResponse.data);
      setShowDocModal(true);
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Error generando documento. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                </svg>
              </div>
              <h1 className="ml-3 text-xl font-bold text-gray-900">JobSeeker AI</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img src={user?.picture} alt={user?.name} className="w-8 h-8 rounded-full" />
                <span className="text-sm text-gray-700">{user?.name}</span>
              </div>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{stats.total_applications}</div>
              <div className="text-sm text-gray-600">Total Postulaciones</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600">{stats.by_status?.applied || 0}</div>
              <div className="text-sm text-gray-600">Aplicaciones Enviadas</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-yellow-600">{stats.by_status?.interview || 0}</div>
              <div className="text-sm text-gray-600">Entrevistas</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-orange-600">{stats.response_rate}%</div>
              <div className="text-sm text-gray-600">Tasa de Respuesta</div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Nueva Postulación</span>
          </button>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          {statusColumns.map(column => {
            const columnApps = applications.filter(app => app.status === column.key);
            return (
              <div key={column.key} className="bg-white rounded-lg p-4 shadow-sm">
                <div className={`${column.color} ${column.textColor} px-3 py-1 rounded-full text-sm font-medium mb-4 text-center`}>
                  {column.title} ({columnApps.length})
                </div>
                <div className="space-y-3">
                  {columnApps.map(app => (
                    <div key={app.id} className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-600">
                      <h4 className="font-medium text-gray-900 text-sm">{app.company}</h4>
                      <p className="text-xs text-gray-600 mb-2">{app.position}</p>
                      {app.location && (
                        <p className="text-xs text-gray-500 mb-2">📍 {app.location}</p>
                      )}
                      
                      {/* Status Change Buttons */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {statusColumns.filter(status => status.key !== app.status).map(status => (
                          <button
                            key={status.key}
                            onClick={() => updateApplicationStatus(app.id, status.key)}
                            className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-700"
                          >
                            → {status.title}
                          </button>
                        ))}
                      </div>
                      
                      {/* AI Actions */}
                      <div className="flex space-x-1 mt-2">
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            generateDocument(app.id, 'cover_letter');
                          }}
                          className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                        >
                          📝 Carta
                        </button>
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            generateDocument(app.id, 'cold_message');
                          }}
                          className="text-xs px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded"
                        >
                          💬 Mensaje
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Application Modal */}
      {showAddModal && (
        <AddApplicationModal 
          onClose={() => setShowAddModal(false)}
          onSave={loadData}
          sessionToken={sessionToken}
        />
      )}

      {/* Document Modal */}
      {showDocModal && selectedApp && (
        <DocumentModal 
          application={selectedApp}
          documents={documents}
          onClose={() => {
            setShowDocModal(false);
            setSelectedApp(null);
            setDocuments([]);
          }}
        />
      )}
    </div>
  );
};

// Add Application Modal Component
const AddApplicationModal = ({ onClose, onSave, sessionToken }) => {
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    status: 'interested',
    location: '',
    salary_range: '',
    job_url: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API}/applications`, formData, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error creating application:', error);
      alert('Error creando postulación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Nueva Postulación</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
            <input
              type="text"
              required
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Posición</label>
            <input
              type="text"
              required
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="interested">Interesado</option>
              <option value="applied">Aplicado</option>
              <option value="interview">Entrevista</option>
              <option value="offer">Oferta</option>
              <option value="rejected">Rechazado</option>
              <option value="ghosted">Sin respuesta</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Document Modal Component
const DocumentModal = ({ application, documents, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            Documentos para {application.company} - {application.position}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        
        <div className="space-y-6">
          {documents.map((doc, index) => (
            <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900">
                  {doc.type === 'cover_letter' ? '📝 Carta de Presentación' : '💬 Mensaje en Frío'}
                </h4>
                <span className="text-xs text-gray-500">
                  {new Date(doc.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                  {doc.content}
                </pre>
              </div>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => navigator.clipboard.writeText(doc.content)}
                  className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  📋 Copiar
                </button>
              </div>
            </div>
          ))}
          
          {documents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>Generando documento...</p>
              <LoadingSpinner />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [sessionToken, setSessionToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for session token in URL (OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('session_token');
    
    if (token) {
      localStorage.setItem('session_token', token);
      setSessionToken(token);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Check for existing session
      const existingToken = localStorage.getItem('session_token');
      setSessionToken(existingToken);
    }
    
    setLoading(false);
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="App">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </div>
  );
}

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? <Dashboard /> : <LandingPage />;
};

export default App;

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useRavenWebSocket } from './hooks/useRavenWebSocket';

// Application Pages
import { OverviewPage } from './pages/OverviewPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { ObjectTrackingPage } from './pages/ObjectTrackingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DatasetPage } from './pages/DatasetPage';
import { ModelLabPage } from './pages/ModelLabPage';
import { CameraPTZPage } from './pages/CameraPTZPage';
import { EventHistoryPage } from './pages/EventHistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsAboutPage } from './pages/SettingsAboutPage';
import { AccountProfilePage } from './pages/AccountProfilePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

// Public & Auth Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';

import { tacticalAudio } from './utils/tacticalAudio';

import {
  LayoutDashboard,
  Video,
  Crosshair,
  BarChart3,
  Database,
  Layers,
  Camera,
  FileText,
  FileCheck,
  Sliders,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  Wifi,
  WifiOff,
  Eye,
  ShieldAlert,
  LogOut,
  Loader2
} from 'lucide-react';

const RavenAuthenticatedApp: React.FC = () => {
  const { user, isAdmin, logout } = useAuth();
  const { telemetry, isConnected } = useRavenWebSocket();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleAudio = () => {
    tacticalAudio.enabled = !audioEnabled;
    setAudioEnabled(!audioEnabled);
    if (!audioEnabled) tacticalAudio.playClick();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const systemRecordsItems = [
    { id: 'event_history', label: 'Event History', icon: FileText },
    { id: 'reports', label: 'Reports', icon: FileCheck },
    { id: 'settings_about', label: 'Settings & About', icon: Sliders },
  ];

  if (isAdmin) {
    systemRecordsItems.push({
      id: 'admin_dashboard',
      label: 'Admin Console',
      icon: ShieldAlert
    });
  }

  const navSections = [
    {
      group: 'Operations',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'live_monitoring', label: 'Live Monitoring', icon: Video },
        { id: 'object_tracking', label: 'Object Tracking', icon: Crosshair },
        { id: 'camera_ptz', label: 'Camera & PTZ', icon: Camera },
      ]
    },
    {
      group: 'Research & Evaluation',
      items: [
        { id: 'analytics', label: 'Analytics & Evaluation', icon: BarChart3 },
        { id: 'model_lab', label: 'Model Laboratory', icon: Layers },
        { id: 'dataset', label: 'Dataset Management', icon: Database },
      ]
    },
    {
      group: 'System & Records',
      items: systemRecordsItems
    }
  ];

  const activeTracksCount = telemetry?.tracks?.length ?? 0;
  const currentFPS = telemetry?.performance?.fps ? telemetry.performance.fps.toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      
      {/* Top Enterprise Header */}
      <header className="h-14 bg-[#0b1120] border-b border-slate-800/80 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo & Product Identity */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white font-bold">
              <Shield className="w-4 h-4 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-sm">RAVEN</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800/60 font-mono font-medium">
                  DeTrAck
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block leading-none">
                Real-Time Vision, Detection and Tracking Analytics
              </p>
            </div>
          </div>
        </div>

        {/* Central Workspace Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-900/60 rounded-full border border-slate-800 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-200">{user?.name}'s Workspace</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 text-[11px] font-mono">Isolated Tenant</span>
        </div>

        {/* Right Header Status, Profile & Tools */}
        <div className="flex items-center gap-2.5">
          {/* Active Targets Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Targets:</span>
            <span className="font-mono font-semibold text-white">{activeTracksCount}</span>
          </div>

          {/* FPS Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">FPS:</span>
            <span className="font-mono font-semibold text-white">{currentFPS}</span>
          </div>

          {/* Connection Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs">
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium hidden md:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400 font-medium hidden md:inline">Offline</span>
              </>
            )}
          </div>

          {/* Audio Alert Toggle */}
          <button
            onClick={toggleAudio}
            className={`p-1.5 rounded transition-colors ${
              audioEnabled
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-400'
            }`}
            title={audioEnabled ? 'Audible alerts enabled' : 'Audible alerts muted'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            title="Toggle fullscreen view"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* User Profile Pill & Dropdown Action */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <button
              onClick={() => setActiveTab('account_profile')}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg transition-colors border ${
                activeTab === 'account_profile'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
              }`}
              title="Account Settings"
            >
              <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-[10px] font-bold">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium hidden md:inline">{user?.name}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                isAdmin ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'
              }`}>
                {user?.role}
              </span>
            </button>

            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Desktop Sidebar Navigation */}
        <aside
          className={`hidden md:flex flex-col bg-[#090e1a] border-r border-slate-800/80 transition-all duration-200 shrink-0 ${
            sidebarCollapsed ? 'w-16' : 'w-60'
          }`}
        >
          <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
            {navSections.map((section) => (
              <div key={section.group} className="space-y-1">
                {!sidebarCollapsed && (
                  <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {section.group}
                  </div>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Collapse Toggle & Engine Info */}
          <div className="p-3 border-t border-slate-800/80">
            {!sidebarCollapsed && (
              <div className="mb-3 px-1 text-[11px] text-slate-500">
                <div className="font-semibold text-slate-400">DeTrAck Pipeline</div>
                <div className="text-[10px] text-slate-500 font-mono">YOLO11s + VaL_CNN</div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors text-xs"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <div className="flex items-center gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  <span>Collapse Navigation</span>
                </div>
              )}
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-64 bg-[#090e1a] border-r border-slate-800 flex flex-col h-full z-50 p-4 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-white text-sm">Navigation Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5">
                {navSections.map((section) => (
                  <div key={section.group} className="space-y-1">
                    <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {section.group}
                    </div>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveTab(item.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium ${
                              isActive
                                ? 'bg-sky-500/10 text-sky-400 font-semibold border border-sky-500/20'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                            }`}
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#070b14]">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && (
              <OverviewPage telemetry={telemetry} onNavigate={setActiveTab} />
            )}
            {activeTab === 'live_monitoring' && (
              <LiveMonitoringPage telemetry={telemetry} />
            )}
            {activeTab === 'object_tracking' && (
              <ObjectTrackingPage telemetry={telemetry} />
            )}
            {activeTab === 'camera_ptz' && (
              <CameraPTZPage telemetry={telemetry} />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsPage />
            )}
            {activeTab === 'model_lab' && (
              <ModelLabPage />
            )}
            {activeTab === 'dataset' && (
              <DatasetPage />
            )}
            {activeTab === 'event_history' && (
              <EventHistoryPage />
            )}
            {activeTab === 'reports' && (
              <ReportsPage />
            )}
            {activeTab === 'settings_about' && (
              <SettingsAboutPage />
            )}
            {activeTab === 'account_profile' && (
              <AccountProfilePage />
            )}
            {activeTab === 'admin_dashboard' && isAdmin && (
              <AdminDashboardPage />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

const RavenAppRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [authView, setAuthView] = useState<string>('landing');

  useEffect(() => {
    // Check URL parameters for single-use email verification or reset token
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('token')) {
      if (window.location.pathname.includes('reset') || urlParams.get('type') === 'reset') {
        setAuthView('reset-password');
      } else {
        setAuthView('verify-email');
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-slate-400 space-y-3 font-sans">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        <span className="text-xs font-mono">Verifying secure authentication session...</span>
      </div>
    );
  }

  // If authenticated, render full client/admin platform
  if (isAuthenticated) {
    return <RavenAuthenticatedApp />;
  }

  // Otherwise, render public landing or authentication views
  return (
    <>
      {authView === 'landing' && <LandingPage onNavigate={setAuthView} />}
      {authView === 'login' && <LoginPage onNavigate={setAuthView} />}
      {authView === 'register' && <RegisterPage onNavigate={setAuthView} />}
      {authView === 'forgot-password' && <ForgotPasswordPage onNavigate={setAuthView} />}
      {authView === 'reset-password' && <ResetPasswordPage onNavigate={setAuthView} />}
      {authView === 'verify-email' && <VerifyEmailPage onNavigate={setAuthView} />}
    </>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RavenAppRouter />
    </AuthProvider>
  );
};

export default App;

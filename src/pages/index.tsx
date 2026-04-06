import { AppProvider, useApp } from '@/contexts/AppContext';
import AuthScreen from '@/components/modals/AuthScreen';
import SidebarNav from '@/components/sidebar/SidebarNav';
import ChatWindow from '@/components/chat/ChatWindow';
import InfoPanel from '@/components/panels/InfoPanel';
import SettingsModal from '@/components/modals/SettingsModal';
import ContactsModal from '@/components/modals/ContactsModal';
import CreateGroupModal from '@/components/modals/CreateGroupModal';
import CreateCommunityModal from '@/components/modals/CreateCommunityModal';
import StarredModal from '@/components/modals/StarredModal';
import CallOverlay from '@/components/overlays/CallOverlay';
import ToastNotifications from '@/components/overlays/ToastNotifications';

function AppShell() {
  const {
    currentUser, showInfoPanel, showSettings, showContacts,
    showCreateGroup, showCreateCommunity, showStarred,
    mobileShowChat,
  } = useApp();

  if (!currentUser) return <AuthScreen />;

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <div className={`
        flex-shrink-0 w-full md:w-[360px] lg:w-[380px]
        ${mobileShowChat ? 'hidden md:flex' : 'flex'}
        flex-col
      `}>
        <SidebarNav />
      </div>

      {/* Chat area */}
      <div className={`
        flex-1 flex overflow-hidden
        ${!mobileShowChat ? 'hidden md:flex' : 'flex'}
      `}>
        <ChatWindow />
        {showInfoPanel && <InfoPanel />}
      </div>

      {/* Modals */}
      {showSettings && <SettingsModal />}
      {showContacts && <ContactsModal />}
      {showCreateGroup && <CreateGroupModal />}
      {showCreateCommunity && <CreateCommunityModal />}
      {showStarred && <StarredModal />}

      {/* Overlays */}
      <CallOverlay />
      <ToastNotifications />
    </div>
  );
}

export default function ZenTalkApp() {
  return (
    <>
      <title>ZenTalk - Connect. Collaborate. Communicate.</title>
      <meta name="description" content="ZenTalk is a modern messaging app with groups, communities, calls, and AI features." />
      <AppProvider>
        <AppShell />
      </AppProvider>
    </>
  );
}

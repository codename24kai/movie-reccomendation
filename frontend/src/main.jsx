import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

import { AuthProvider } from './context/AuthContext'
import { CollectionProvider } from './context/CollectionContext'
import { ChatProvider } from './context/ChatContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '481415048383-tcd9ogu1skjjr7nh43ocgafl9f71h400.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <CollectionProvider>
          <ChatProvider>
            <App />
          </ChatProvider>
        </CollectionProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)

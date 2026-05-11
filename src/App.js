/* eslint-disable */
import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, getDocs } from 'firebase/firestore';
import Peer from 'peerjs';

// --- YOUR FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAZ2sBoHHEbS-kfhfJRqW6W3eYKRAaUUR4",
  authDomain: "setu-652cf.firebaseapp.com",
  projectId: "setu-652cf",
  storageBucket: "setu-652cf.firebasestorage.app",
  messagingSenderId: "258865594123",
  appId: "1:258865594123:web:7bdccf77823073a4f1ec0e"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- ICONS ---
const Icons = {
  Send: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Image: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Download: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Profile: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Chat: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  MenuDots: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  Back: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Tree: () => <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#D4A373" strokeWidth="1.5"><path d="M12 22v-8"/><path d="M12 14c-2.5-2.5-2-6-2-6s1.5-1 3-1 3 1 3 1 .5 3.5-2 6"/><path d="M8 12c-2.5 0-4-1.5-4-1.5s1-2.5 3-2.5"/><path d="M16 12c2.5 0 4-1.5 4-1.5s-1-2.5-3-2.5"/><path d="M4 22h16"/></svg>,
  PhoneOff: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
};

export default function App() {
  const [user, setUser] = useState(null);
  const [showIntro, setShowIntro] = useState(true); // Control Intro Animation
  const [setuId, setSetuId] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  
  // Login States
  const [loginMode, setLoginMode] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  // Chat States
  const [connectInput, setConnectInput] = useState('');
  const [activeRoom, setActiveRoom] = useState(null);
  const [currentFriendId, setCurrentFriendId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState(null); 
  const messagesEndRef = useRef(null);

  // Call States
  const [peer, setPeer] = useState(null);
  const [callState, setCallState] = useState(null); // 'calling', 'receiving', 'active'
  const [incomingCall, setIncomingCall] = useState(null);
  const myVideoRef = useRef();
  const remoteVideoRef = useRef();

  // --- INTRO SCREEN TIMER (4 seconds) ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false); // Hide intro and show login after 4 seconds
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // --- 1. LOCAL STORAGE (Save Session) ---
  useEffect(() => {
    const savedSession = localStorage.getItem('setuSession');
    if(savedSession) {
      const data = JSON.parse(savedSession);
      setUser(data); setSetuId(data.setuId);
    }
  }, []);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  const generateSetuId = () => Math.floor(10000 + Math.random() * 90000).toString();

  // --- 2. GOOGLE LOGIN ---
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      let assignedId = generateSetuId();
      
      const q = query(collection(db, 'users'), where('uid', '==', u.uid));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        assignedId = snap.docs[0].data().setuId;
      } else {
        await setDoc(doc(db, 'users', assignedId), { uid: u.uid, setuId: assignedId, displayName: u.displayName, createdAt: new Date() });
      }
      
      const sessionData = { uid: u.uid, setuId: assignedId, displayName: u.displayName };
      setUser(sessionData); setSetuId(assignedId);
      localStorage.setItem('setuSession', JSON.stringify(sessionData));
    } catch (error) { console.error("Login Error", error); }
  };

  // --- 3. BASIC PHONE LOGIN (No OTP) ---
  const handlePhoneLogin = async () => {
    if(phoneInput.length < 10 || nameInput.length < 2) return alert("Please enter valid name and 10-digit number.");
    
    const q = query(collection(db, 'users'), where('phoneNumber', '==', phoneInput));
    const snap = await getDocs(q);
    
    let assignedId = "";
    let finalName = nameInput;

    if (!snap.empty) {
      const existingUser = snap.docs[0].data();
      assignedId = existingUser.setuId;
      finalName = existingUser.displayName;
    } else {
      assignedId = generateSetuId();
      await setDoc(doc(db, 'users', assignedId), { uid: assignedId, setuId: assignedId, displayName: nameInput, phoneNumber: phoneInput, createdAt: new Date() });
    }
    
    const sessionData = { uid: assignedId, setuId: assignedId, displayName: finalName, phoneNumber: phoneInput };
    setUser(sessionData); setSetuId(assignedId);
    localStorage.setItem('setuSession', JSON.stringify(sessionData));
  };

  const handleLogout = () => {
    auth.signOut();
    localStorage.removeItem('setuSession');
    setUser(null); setSetuId(null); setActiveRoom(null); setPeer(null);
  };

  // --- 4. CONNECT VIA ID OR PHONE ---
  const connectToChaupal = async () => {
    let targetId = connectInput.trim();
    if(targetId.length === 0) return;

    if(targetId.length > 5) {
        const q = query(collection(db, 'users'), where('phoneNumber', '==', targetId));
        const snap = await getDocs(q);
        if(snap.empty) {
            const invite = window.confirm("यह नंबर अभी Setu पर नहीं है! क्या आप उन्हें WhatsApp पर Invite भेजना चाहते हैं?");
            if(invite) {
                const message = "Hey! I am calling you on Setu Chaupal. Join me here fast: https://setu-india.netlify.app/";
                window.open(`https://wa.me/91${targetId}?text=${encodeURIComponent(message)}`, '_blank');
            }
            return;
        }
        targetId = snap.docs[0].data().setuId;
    } else if (targetId.length !== 5) {
        return alert("Invalid 5-Digit ID or Phone Number.");
    }

    setCurrentFriendId(targetId);
    setActiveRoom([setuId, targetId].sort().join('_'));
  };

  // Chat Listener
  useEffect(() => {
    if (!activeRoom) return;
    const q = query(collection(db, 'rooms', activeRoom, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [activeRoom]);

  const sendMessage = async (text, type = 'text', fileData = null) => {
    if (!activeRoom) return;
    if (type === 'text' && !text.trim()) return;
    await addDoc(collection(db, 'rooms', activeRoom, 'messages'), { text, type, fileUrl: fileData, senderId: setuId, senderName: user.displayName, timestamp: serverTimestamp() });
    setInputText('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => sendMessage('📸 Photo', 'image', reader.result);
      reader.readAsDataURL(file);
    }
  };

  // --- 5. WEBRTC VIDEO/AUDIO CALL ENGINE ---
  useEffect(() => {
    if(!setuId) return;
    const newPeer = new Peer(setuId);
    
    newPeer.on('call', (call) => {
      setIncomingCall(call);
      setCallState('receiving');
    });
    
    setPeer(newPeer);
    return () => newPeer.destroy();
  }, [setuId]);

  const startCall = async (videoEnabled) => {
    setShowMenu(false);
    setCallState('calling');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoEnabled, audio: true });
      if(myVideoRef.current) myVideoRef.current.srcObject = stream;
      
      const call = peer.call(currentFriendId, stream);
      call.on('stream', (remoteStream) => {
        setCallState('active');
        if(remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });
      setIncomingCall(call);
    } catch (err) { alert("Camera/Microphone access denied."); setCallState(null); }
  };

  const answerCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if(myVideoRef.current) myVideoRef.current.srcObject = stream;
      
      incomingCall.answer(stream);
      incomingCall.on('stream', (remoteStream) => {
        setCallState('active');
        if(remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });
    } catch (err) { alert("Failed to answer. Check permissions."); setCallState(null); }
  };

  const endCall = () => {
    if(incomingCall) incomingCall.close();
    setCallState(null); setIncomingCall(null);
    if(myVideoRef.current && myVideoRef.current.srcObject) {
      myVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  };


  // --- UI RENDERS ---
  if (!user) {
    return (
      <>
        {/* 1. New Smooth Intro Animation (Splash Screen) */}
        {showIntro && (
          <div className="splash-container">
            <div className="splash-logo-box">
              <Icons.Tree />
            </div>
            <div className="splash-text-logo">Setu</div>
            <div className="splash-subtitle">Connecting Chaupals</div>
          </div>
        )}
        
        <div className="mobile-container dark-theme">
          <div className="login-box animate-pop">
            <Icons.Tree />
            <h1 className="logo-text">Setu</h1>
            <p className="subtitle">ENTER THE CHAUPAL</p>
            
            {!loginMode ? (
              <>
                <button onClick={handleGoogleLogin} className="btn-google" style={{marginBottom: '15px'}}>Continue with Google</button>
                <div className="divider"><span>OR</span></div>
                <button onClick={() => setLoginMode('phone')} className="btn-phone">Login via Phone Number</button>
              </>
            ) : (
              <>
                <input type="text" placeholder="Your Display Name" value={nameInput} onChange={e => setNameInput(e.target.value)} className="input-field" />
                <input type="number" placeholder="Mobile No. (e.g. 9876543210)" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} className="input-field" />
                <button onClick={handlePhoneLogin} className="btn-primary" style={{width: '100%', marginBottom: '15px'}}>Create & Enter</button>
                <button onClick={() => setLoginMode(null)} className="btn-text" style={{width: '100%'}}>Back</button>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="mobile-container dark-theme">
      {/* Call Overlay */}
      {callState && (
        <div className="call-overlay">
          <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
          <video ref={myVideoRef} autoPlay playsInline muted className="local-video" />
          
          <div className="call-controls">
            {callState === 'receiving' && <button onClick={answerCall} className="btn-answer">📞 Answer</button>}
            {callState === 'calling' && <p style={{color: '#fff'}}>Calling...</p>}
            <button onClick={endCall} className="btn-endcall"><Icons.PhoneOff /></button>
          </div>
        </div>
      )}

      {fullScreenImage && (
        <div className="fullscreen-viewer">
          <header className="viewer-header">
            <span onClick={() => setFullScreenImage(null)} className="icon-btn" style={{color:'#fff'}}><Icons.Back /></span>
            <span onClick={() => {
              const a = document.createElement('a'); a.href = fullScreenImage; a.download = 'Setu_Image.png';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
            }} className="icon-btn" style={{color:'#D4A373'}}><Icons.Download /></span>
          </header>
          <img src={fullScreenImage} alt="Full Screen" />
        </div>
      )}

      {!activeRoom ? (
        <div style={{flex: 1, width: '100%', display: 'flex', flexDirection: 'column'}}>
          <header className="main-header">
            <h2 style={{color: '#D4A373', margin: 0, fontFamily: 'Yatra One'}}>{activeTab === 'chat' ? 'Chaupals' : 'Profile'}</h2>
            <Icons.MenuDots />
          </header>

          <main className="main-content" style={{padding: '20px'}}>
            {activeTab === 'chat' ? (
               <div className="dashboard-card animate-pop">
                  <p style={{color: '#A68A6D', fontSize: '14px', marginBottom: '5px'}}>Your Master ID</p>
                  <h1 style={{color: '#D4A373', fontSize: '40px', letterSpacing: '4px', margin: '0 0 20px 0'}}>{setuId}</h1>
                  <div className="divider"><span>CONNECT</span></div>
                  <input type="text" placeholder="Enter Friend's 5-Digit ID or Mobile No." value={connectInput} onChange={(e) => setConnectInput(e.target.value)} className="input-field" />
                  <button onClick={connectToChaupal} className="btn-primary" style={{width: '100%'}}>Start Chat</button>
               </div>
            ) : (
               <div className="profile-section animate-pop">
                  <div className="avatar-circle">{user.displayName.charAt(0)}</div>
                  <h3 style={{color: '#EAE0D5', margin: '10px 0 0 0'}}>{user.displayName}</h3>
                  <p style={{color: '#A68A6D', fontSize: '14px', marginTop: '5px'}}>{user.phoneNumber || 'Google Account'}</p>
                  
                  <div className="settings-list">
                    <div className="setting-item"><span>Language</span> <span style={{color:'#D4A373'}}>English</span></div>
                    <div className="setting-item"><span>Status</span> <span style={{color:'#4caf50'}}>Online</span></div>
                  </div>
                  <button onClick={handleLogout} className="btn-text" style={{marginTop: '20px', width: '100%'}}>Logout & Clear Data</button>
               </div>
            )}
          </main>

          <nav className="bottom-nav">
            <button onClick={() => setActiveTab('chat')} className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`}><Icons.Chat /> Chats</button>
            <button onClick={() => setActiveTab('profile')} className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}><Icons.Profile /> Profile</button>
          </nav>
        </div>
      ) : (
        <div style={{flex: 1, width: '100%', display: 'flex', flexDirection: 'column'}}>
          <header className="chat-header">
            <button onClick={() => setActiveRoom(null)} className="icon-btn"><Icons.Back /></button>
            <div style={{flex: 1, marginLeft: '15px'}}>
                <h2 style={{color: '#EAE0D5', margin: 0, fontSize: '18px'}}>ID: {currentFriendId}</h2>
                <span style={{color: '#4caf50', fontSize: '12px'}}>● Private Room</span>
            </div>
            <button onClick={() => setShowMenu(!showMenu)} className="icon-btn"><Icons.MenuDots /></button>
            {showMenu && (
                <div className="menu-dropdown">
                    <button onClick={() => startCall(false)}><span style={{marginRight: '8px'}}>📞</span> Voice Call</button>
                    <button onClick={() => startCall(true)}><span style={{marginRight: '8px'}}>📹</span> Video Call</button>
                </div>
            )}
          </header>

          <main className="chat-area">
            {messages.map((msg) => (
              <div key={msg.id} className={`message-bubble animate-pop ${msg.senderId === setuId ? 'sent' : 'received'}`}>
                {msg.senderId !== setuId && <span className="sender-name">{msg.senderName}</span>}
                {msg.type === 'text' && <p>{msg.text}</p>}
                {msg.type === 'image' && <img src={msg.fileUrl} alt="Shared" className="chat-image" onClick={() => setFullScreenImage(msg.fileUrl)} />}
                <span className="msg-time">{msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </main>

          <div className="chat-input-area">
            <label className="attachment-btn"><Icons.Image /><input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} /></label>
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputText, 'text')} placeholder="Type a message..." className="chat-input"/>
            <button onClick={() => sendMessage(inputText, 'text')} className="btn-send"><Icons.Send /></button>
          </div>
        </div>
      )}
    </div>
  );
}

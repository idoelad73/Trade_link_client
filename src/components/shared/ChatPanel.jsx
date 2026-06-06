import { useState, useEffect, useRef } from 'react';
import { getSocket } from '../../api/socket.js';
import { uploadChatFile as defaultUpload } from '../../api/contractor.js';

/**
 * ChatPanel — real-time WebSocket chat with file/image/doc attachment.
 *
 * Props:
 *   contractorId   string
 *   tradeProId     string
 *   siteId         string
 *   siteName       string
 *   userType       'contractor' | 'trade'
 *   initialMessages array
 *   onClose        fn
 *   className      string
 *   style          object
 */
export default function ChatPanel({
  contractorId, tradeProId, siteId,
  siteName = '',
  userType,
  initialMessages = [],
  onClose,
  uploadFn,         // optional — override the upload API (e.g. trade side passes trade's uploadChatFile)
  className = '',
  style = {},
}) {
  const uploadChatFile = uploadFn ?? defaultUpload;
  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);
  const socketRef      = useRef(null);

  const [messages,   setMessages]   = useState(initialMessages);
  const [text,       setText]       = useState('');
  const [connected,  setConnected]  = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // { file, localUrl, type }

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onMessage    = (msg) => setMessages(prev => [...prev, msg]);

    socket.on('connect',     onConnect);
    socket.on('disconnect',  onDisconnect);
    socket.on('new_message', onMessage);

    socket.emit('join_chat', { contractorId, tradeProId, siteId });
    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect',     onConnect);
      socket.off('disconnect',  onDisconnect);
      socket.off('new_message', onMessage);
    };
  }, [contractorId, tradeProId, siteId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendText = () => {
    const trimmed = text.trim();
    if (!trimmed || !socketRef.current || !connected) return;
    socketRef.current.emit('send_message', { contractorId, tradeProId, siteId, text: trimmed });
    setText('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText(); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext  = file.name.split('.').pop().toLowerCase();
    const type = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? 'image'
               : ext === 'pdf' ? 'pdf'
               : 'word';
    const localUrl = type === 'image' ? URL.createObjectURL(file) : null;
    setPreviewFile({ file, localUrl, type });
    e.target.value = '';
  };

  const sendFile = async () => {
    if (!previewFile || uploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', previewFile.file);
      fd.append('contractorId', contractorId);
      fd.append('tradeProId',   tradeProId);
      fd.append('siteId',       siteId);
      fd.append('text',         text.trim());
      await uploadChatFile(fd);
      setText('');
      setPreviewFile(null);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const fmt = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const FileAttachment = ({ msg, isMine }) => {
    if (!msg.fileUrl) return null;
    const base = isMine ? 'text-violet-100' : 'text-slate-500';

    if (msg.fileType === 'image') {
      return (
        <a href={msg.fileUrl} target="_blank" rel="noreferrer">
          <img src={msg.fileUrl} alt={msg.fileName} className="mt-1 max-w-[180px] rounded-xl border border-white/20 object-cover" />
        </a>
      );
    }
    const icon = msg.fileType === 'pdf' ? '📄' : '📝';
    return (
      <a href={msg.fileUrl} target="_blank" rel="noreferrer"
         download={msg.fileName ?? true}
         className={`mt-1 flex items-center gap-1.5 text-[11px] font-semibold underline ${base}`}>
        {icon} {msg.fileName ?? 'Document'}
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </a>
    );
  };

  return (
    <div className={`flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden ${className}`} style={style}>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white flex-shrink-0">
        <div className="w-7 h-7 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-extrabold text-slate-800 truncate">{siteName}</p>
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-300'}`} />
            <span className="text-[9px] text-slate-400">{connected ? 'Live' : 'Connecting…'}</span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-500 text-sm transition flex-shrink-0">×</button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-2xl mb-1">💬</div>
              <p className="text-xs text-slate-400">No messages yet. Say hello!</p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender === userType;
            return (
              <div key={msg._id ?? i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                  isMine ? 'bg-violet-500 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}>
                  {msg.text && <p className="text-xs leading-relaxed break-words">{msg.text}</p>}
                  <FileAttachment msg={msg} isMine={isMine} />
                  <p className={`text-[9px] mt-0.5 ${isMine ? 'text-violet-200' : 'text-slate-400'} text-right`}>
                    {fmt(msg.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File preview strip */}
      {previewFile && (
        <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-2 flex-shrink-0">
          {previewFile.type === 'image' ? (
            <img src={previewFile.localUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-lg">
              {previewFile.type === 'pdf' ? '📄' : '📝'}
            </div>
          )}
          <span className="flex-1 text-[10px] text-slate-600 truncate">{previewFile.file.name}</span>
          <button onClick={() => setPreviewFile(null)} className="text-slate-400 hover:text-red-400 text-sm transition">×</button>
        </div>
      )}

      {/* Input bar */}
      <div className="px-2 py-2 border-t border-slate-100 flex items-center gap-1.5 bg-white flex-shrink-0">

        {/* 📎 Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Attach file"
          className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-violet-100 text-slate-400 hover:text-violet-600 flex items-center justify-center transition flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input ref={fileInputRef} type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleFileChange}
        />

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={previewFile ? 'Add a caption…' : 'Message…'}
          className="flex-1 text-xs border border-slate-200 rounded-2xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-slate-50"
        />

        {/* Send button — switches to upload mode if file is queued */}
        <button
          onClick={previewFile ? sendFile : sendText}
          disabled={previewFile ? uploading : (!text.trim() || !connected)}
          className="w-7 h-7 rounded-xl bg-violet-500 hover:bg-violet-400 text-white flex items-center justify-center disabled:opacity-40 transition shadow-sm shadow-violet-200 flex-shrink-0"
        >
          {uploading ? (
            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

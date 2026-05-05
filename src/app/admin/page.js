'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [tracks, setTracks] = useState([]);
  const [settings, setSettings] = useState({ adFrequency: 3 });
  
  const [file, setFile] = useState(null);
  const [type, setType] = useState('SONG');
  const [importance, setImportance] = useState('1');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTracks();
    fetchSettings();
  }, []);

  const fetchTracks = async () => {
    const res = await fetch('/api/tracks');
    if(res.ok) setTracks(await res.json());
  }

  const fetchSettings = async () => {
    const res = await fetch('/api/settings');
    if(res.ok) setSettings(await res.json());
  }

  const getAudioDuration = (file) => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        resolve(0);
      });
    });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file");
    setUploading(true);
    
    try {
      // 1. Get Duration
      const duration = await getAudioDuration(file);

      // 2. Get Signed URL
      const urlRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'audio/mpeg' })
      });
      
      if (!urlRes.ok) throw new Error("Could not get upload URL");
      const { signedUrl, publicUrl, safeFilename } = await urlRes.json();

      // 3. Upload directly to Firebase Storage
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'audio/mpeg' },
        body: file
      });
      
      if (!uploadRes.ok) throw new Error("Direct upload failed. Are CORS rules set?");

      // 4. Save metadata to Firestore
      const dbRes = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: file.name,
          filename: safeFilename,
          url: publicUrl,
          type: type,
          importance: type === 'ADVERTISEMENT' ? importance : null,
          duration: duration
        })
      });

      if (dbRes.ok) {
        setFile(null);
        e.target.reset();
        fetchTracks();
      } else {
        throw new Error("Failed to save track data");
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed: " + err.message);
    }
    setUploading(false);
  }

  const handleDelete = async (id) => {
    if(!confirm("Delete this track?")) return;
    await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
    fetchTracks();
  }

  const updateSettings = async (freq) => {
    const newFreq = parseInt(freq);
    setSettings({ ...settings, adFrequency: newFreq });
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adFrequency: newFreq })
    });
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1>RADIO_ADMIN_SYS</h1>
        <Link href="/" className="button">Launch Player</Link>
      </header>

      <div className="admin-grid">
        
        <div>
          <div className="panel" style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-magenta)' }}>Upload Audio</h2>
            <form onSubmit={handleUpload}>
              <label style={{ display: 'block', marginBottom: '5px' }}>File (MP3/WAV)</label>
              <input 
                type="file" 
                accept="audio/*" 
                onChange={(e) => setFile(e.target.files[0])} 
                className="input" 
                required
              />

              <label style={{ display: 'block', marginBottom: '5px' }}>Status</label>
              <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="SONG">Song (Rotation)</option>
                <option value="PLAY_ONCE">Play Once</option>
                <option value="ADVERTISEMENT">Advertisement</option>
              </select>

              {type === 'ADVERTISEMENT' && (
                <>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Importance Level</label>
                  <select className="select" value={importance} onChange={(e) => setImportance(e.target.value)}>
                    <option value="1">Level 1 (Low)</option>
                    <option value="2">Level 2 (Medium)</option>
                    <option value="3">Level 3 (High)</option>
                  </select>
                </>
              )}

              <button type="submit" className="button primary" disabled={uploading} style={{ width: '100%', marginTop: '10px' }}>
                {uploading ? 'UPLOADING...' : 'UPLOAD TRACK'}
              </button>
            </form>
          </div>

          <div className="panel">
            <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-yellow)' }}>Global Settings</h2>
            <label style={{ display: 'block', marginBottom: '5px' }}>Play Ad After X Songs</label>
            <select 
              className="select" 
              value={settings.adFrequency} 
              onChange={(e) => updateSettings(e.target.value)}
            >
              <option value="1">1 Song</option>
              <option value="2">2 Songs</option>
              <option value="3">3 Songs</option>
              <option value="4">4 Songs</option>
            </select>
          </div>
        </div>

        <div className="panel">
          <h2 style={{ fontSize: '1.2rem' }}>Track Database</h2>
          <div className="table-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--neon-cyan)' }}>
                <th style={{ padding: '10px' }}>Title</th>
                <th style={{ padding: '10px' }}>Type</th>
                <th style={{ padding: '10px' }}>Status/Imp.</th>
                <th style={{ padding: '10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tracks.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No tracks found.</td>
                </tr>
              ) : tracks.map(track => (
                <tr key={track.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '10px' }}>{track.title}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ 
                      padding: '3px 6px', 
                      background: track.type === 'ADVERTISEMENT' ? 'rgba(255,251,0,0.2)' : track.type === 'PLAY_ONCE' ? 'rgba(255,0,255,0.2)' : 'rgba(0,243,255,0.2)',
                      color: track.type === 'ADVERTISEMENT' ? 'var(--neon-yellow)' : track.type === 'PLAY_ONCE' ? 'var(--neon-magenta)' : 'var(--neon-cyan)',
                      borderRadius: '3px',
                      fontSize: '0.8rem'
                    }}>{track.type}</span>
                  </td>
                  <td style={{ padding: '10px', fontSize: '0.9rem' }}>
                    {track.type === 'ADVERTISEMENT' ? `Lvl ${track.importance}` : track.status}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <button onClick={() => handleDelete(track.id)} className="button" style={{ padding: '5px 10px', fontSize: '0.8rem', borderColor: '#ff4444', color: '#ff4444' }}>DEL</button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

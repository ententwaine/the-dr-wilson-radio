'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function RadioPlayer() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  
  const audioRef = useRef(null);
  const syncTimeoutRef = useRef(null);

  const fetchNowPlaying = async () => {
    try {
      const res = await fetch(`/api/now-playing`);
      const data = await res.json();
      
      if (data.track) {
        setCurrentTrack({ ...data.track, isAd: data.isAd });
        
        if (audioRef.current) {
          // Sync with the DJ
          audioRef.current.currentTime = data.seekOffset || 0;
          if (isPlaying) {
            audioRef.current.play().catch(e => console.error("Auto-play prevented", e));
          }
        }
        
        // Failsafe sync check: If the track is supposed to end, force a refresh
        // just in case the onEnded event fails to fire
        const remainingTime = (data.track.duration - data.seekOffset) * 1000;
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
          if (isPlaying) fetchNowPlaying();
        }, remainingTime + 2000); // 2 second buffer

      } else {
        setCurrentTrack(null);
        setIsPlaying(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNowPlaying();
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  const handleEnded = () => {
    // Current track ended, ask DJ for the next one immediately
    fetchNowPlaying();
  };

  const togglePlay = () => {
    if (!currentTrack) {
      fetchNowPlaying();
      setIsPlaying(true);
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Re-sync with DJ when resuming to ensure we jump to live time
      fetchNowPlaying();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && audioRef.current.duration) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // When current track changes (from fetch), ensure we play if we are supposed to
  useEffect(() => {
    if (currentTrack && audioRef.current && isPlaying) {
      audioRef.current.play().catch(e => {
        console.error("Auto-play prevented", e);
        setIsPlaying(false); // Update state if blocked
      });
    }
  }, [currentTrack]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative'
    }}>
      
      {/* Decorative background elements */}
      <div style={{
        position: 'absolute', top: '10%', left: '5%', width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(0,243,255,0.1) 0%, transparent 70%)', zIndex: -1
      }}></div>
      <div style={{
        position: 'absolute', bottom: '10%', right: '5%', width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(255,0,255,0.1) 0%, transparent 70%)', zIndex: -1
      }}></div>

      <header style={{ position: 'absolute', top: 20, width: '100%', padding: '0 40px', display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--neon-magenta)' }}>// SYSTEM.RADIO.BROADCAST</h2>
        <Link href="/admin" style={{ fontSize: '0.8rem', opacity: 0.5 }}>ADMIN_ACCESS</Link>
      </header>

      <div className="panel" style={{ width: '90%', maxWidth: '400px', padding: '40px 20px', textAlign: 'center', boxShadow: isPlaying ? '0 0 20px rgba(0, 243, 255, 0.2)' : 'none', transition: 'box-shadow 0.5s' }}>
        
        <div style={{ 
          width: '200px', height: '200px', margin: '0 auto 30px auto', 
          border: `2px solid ${isPlaying ? 'var(--neon-cyan)' : 'var(--border-color)'}`,
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isPlaying ? '0 0 30px rgba(0, 243, 255, 0.4) inset, 0 0 30px rgba(0, 243, 255, 0.4)' : 'none',
          animation: isPlaying ? 'pulse 2s infinite alternate' : 'none'
        }}>
          {currentTrack ? (
             <div style={{ color: currentTrack.isAd ? 'var(--neon-yellow)' : currentTrack.type === 'PLAY_ONCE' ? 'var(--neon-magenta)' : 'var(--neon-cyan)' }}>
                {currentTrack.isAd ? 'ADVERT' : 'LIVE'}
             </div>
          ) : (
            <div style={{ color: 'var(--text-secondary)' }}>STANDBY</div>
          )}
        </div>

        <h1 style={{ fontSize: '1.5rem', marginBottom: '10px', height: '30px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentTrack ? currentTrack.title.replace(/\.[^/.]+$/, "") : "NO SIGNAL"}
        </h1>
        <p style={{ color: 'var(--neon-magenta)', fontSize: '0.8rem', marginBottom: '30px' }}>
          {currentTrack ? `[ ${currentTrack.isAd ? 'SPONSORED BROADCAST' : currentTrack.type === 'PLAY_ONCE' ? 'PRIORITY OVERRIDE' : 'GLOBAL SYNC'} ]` : 'AWAITING CONNECTION'}
        </p>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', marginBottom: '30px', position: 'relative' }}>
          <div style={{ 
            position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`,
            background: 'var(--neon-cyan)', boxShadow: '0 0 10px var(--neon-cyan)'
          }}></div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
          <button className="button" onClick={togglePlay} style={{ borderRadius: '50%', width: '60px', height: '60px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isPlaying ? '||' : '►'}
          </button>
        </div>

        {/* Volume */}
        <div style={{ marginTop: '30px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>VOL</span>
          <input 
            type="range" min="0" max="1" step="0.01" 
            value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ width: '100px', accentColor: 'var(--neon-cyan)' }}
          />
        </div>

      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 10px rgba(0,243,255,0.2) inset, 0 0 10px rgba(0,243,255,0.2); }
          100% { transform: scale(1.05); box-shadow: 0 0 30px rgba(0,243,255,0.6) inset, 0 0 30px rgba(0,243,255,0.6); }
        }
      `}</style>

      {currentTrack && (
        <audio 
          ref={audioRef}
          src={currentTrack.url}
          onEnded={handleEnded}
          onTimeUpdate={handleTimeUpdate}
        />
      )}
    </div>
  );
}

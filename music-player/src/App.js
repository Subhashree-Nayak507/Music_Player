import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
  const [musicFiles, setMusicFiles] = useState([]);
  const [currentSongIndex, setCurrentSongIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const fetchMusicFiles = async () => {
      try {
        const response = await axios.get('/api/music');
        setMusicFiles(response.data);
      } catch (error) {
        console.error('Error fetching music files:', error);
      }
    };
    fetchMusicFiles();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (currentSongIndex !== null && musicFiles.length > 0) {
      audio.src = `/api/music/download/${musicFiles[currentSongIndex].filename}`;
      if (isPlaying) {
        audio.play().catch(e => console.error("Error playing audio:", e));
      } else {
        audio.pause();
      }
    }
    const handleEnded = () => {
      handleNext();
    };
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [currentSongIndex, isPlaying, musicFiles]);

  const togglePlayPause = (index) => {
    if (currentSongIndex === index) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentSongIndex(index);
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  const handlePrevious = () => {
    setCurrentSongIndex(prevIndex => 
      prevIndex > 0 ? prevIndex - 1 : musicFiles.length - 1
    );
    setIsPlaying(true);
  };

  const handleNext = () => {
    setCurrentSongIndex(prevIndex => 
      prevIndex < musicFiles.length - 1 ? prevIndex + 1 : 0
    );
    setIsPlaying(true);
  };
  
  const handleUpload = async (event) => {
    if (!event.target.files || event.target.files.length === 0) {
      alert('No file selected. Please select a file to upload.');
      return;
    }
    const file = event.target.files[0];
    if (!file) {
      alert('Invalid file. Please select a valid file to upload.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post('http://localhost:3000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('File uploaded successfully:', response.data);
    } catch (error) {
      console.error('Error uploading file:', error);
      if (error.response) {
        console.error('Server responded with:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('Request made but no response received:', error.request);
      } else {
        console.error('Error', error.message);
      }
      alert('Failed to upload file. Please try again.');
    }
  };
  
  const handleDownload = (filename) => {
    const link = document.createElement('a');
    link.href = `/api/music/download/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="music-player">
      <h1>Music Player</h1>
      <div className="player-container">
        {currentSongIndex !== null && (
          <div className="now-playing">
            <div className="song-info">
              <h2>{musicFiles[currentSongIndex].filename}</h2>
            </div>
            <div className="progress-bar">
              <div className="progress"></div>
            </div>
            <div className="controls">
              <button onClick={handlePrevious}>⏮</button>
              <button onClick={() => togglePlayPause(currentSongIndex)}>
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button onClick={handleStop}>⏹</button>
              <button onClick={handleNext}>⏭</button>
              <button onClick={() => handleDownload(musicFiles[currentSongIndex].filename)}>⬇️</button>
            </div>
          </div>
        )}
        <div className="upload-section">
          <input type="file" accept=".mp3" onChange={handleUpload} />
          <label htmlFor="file-upload">Upload MP3 File</label>
        </div>

        <div className="playlist">
          <h3>Playlist</h3>
          {musicFiles.map((song, index) => (
            <div 
              key={song._id} 
              className={`playlist-item ${currentSongIndex === index ? 'active' : ''}`}
              onClick={() => togglePlayPause(index)}
            >
              <span className="song-name">{song.filename}</span>
              {currentSongIndex === index && isPlaying && <span className="now-playing-icon">🎵</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function WarmupButton() {
  const [warming, setWarming] = useState(false);
  const [warmedUp, setWarmedUp] = useState(false);

  const handleWarmup = async () => {
    setWarming(true);
    
    try {
      const response = await axios.post('https://smart-attendance-backend-f3my.onrender.com/admin/warmup');
      
      if (response.data.status === 'success') {
        setWarmedUp(true);
        toast.success('✅ System ready! Face recognition will now be instant.');
        
        // Reset the warmed up indicator after 10 seconds
        setTimeout(() => {
          setWarmedUp(false);
        }, 10000);
      } else {
        toast.error(response.data.message || 'Warmup failed');
      }
    } catch (error) {
      console.error('Warmup error:', error);
      toast.error('Failed to warm up system. Please try again.');
    } finally {
      setWarming(false);
    }
  };

  return (
    <button
      className={`floating-warmup-btn ${warmedUp ? 'warmed' : ''}`}
      onClick={handleWarmup}
      disabled={warming || warmedUp}
      title={warmedUp ? "System is ready!" : "Warm up face recognition system"}
    >
      {warming ? (
        <span className="warmup-spinner">⏳</span>
      ) : warmedUp ? (
        <span className="warmup-check">✅</span>
      ) : (
        <span className="warmup-fire">🔥</span>
      )}
      <span className="warmup-text">
        {warming ? 'Warming...' : warmedUp ? 'Ready!' : 'Warm Up'}
      </span>
    </button>
  );
}

export default WarmupButton;
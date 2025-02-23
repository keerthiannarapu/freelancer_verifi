import { useState, useRef, useEffect } from 'react';

const FreelancerVerification = () => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [image, setImage] = useState(null);
  const [verificationResult, setVerificationResult] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setError('Failed to access camera');
      console.error('Camera error:', err);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRegistration = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('address', address);
    formData.append('image', image);

    try {
      const response = await fetch('http://localhost:8000/register_freelancer/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      setIsRegistered(true);
      startCamera();
    } catch (err) {
      setError('Registration failed');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLivenessCheck = async () => {
    if (!videoRef.current) return;

    setLoading(true);
    setError('');
    
    try {
      const imageSrc = captureFrame();
      if (!imageSrc) {
        throw new Error('Failed to capture image');
      }
      
      const response = await fetch('http://localhost:8000/verify_liveness/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageSrc }),
      });

      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const data = await response.json();
      setVerificationResult(data.result);
    } catch (err) {
      setError('Verification failed');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          {!isRegistered ? (
            <div className="max-w-md mx-auto">
              <div className="divide-y divide-gray-200">
                <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                  <h2 className="text-2xl font-bold mb-8">Freelancer Registration</h2>
                  <form onSubmit={handleRegistration} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Profile Image</label>
                      <input
                        type="file"
                        onChange={handleImageChange}
                        className="mt-1 block w-full"
                        accept="image/*"
                        required
                      />
                      {previewUrl && (
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="mt-2 max-h-40 rounded"
                        />
                      )}
                    </div>

                    {error && <p className="text-red-500">{error}</p>}
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {loading ? 'Registering...' : 'Register'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-8">Liveness Check</h2>
              <div className="space-y-4">
                <div className="relative aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                </div>
                
                {verificationResult && (
                  <p className={`text-center font-medium ${
                    verificationResult.includes('Live') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {verificationResult}
                  </p>
                )}
                
                {error && <p className="text-red-500 text-center">{error}</p>}
                
                <button
                  onClick={handleLivenessCheck}
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {loading ? 'Checking...' : 'Check Liveness'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FreelancerVerification;
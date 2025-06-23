import { useState, useRef, useEffect, useCallback } from 'react';
import {Upload as UploadIcon, X, Copy, Check, Calendar, Clock, ExternalLink, Trash2} from 'lucide-react';
import { io } from 'socket.io-client';

const baseUrl = import.meta.env.VITE_SERVER_URL;

// Custom hook for managing video upload state
const useVideoUpload = () => {
    const [uploadState, setUploadState] = useState({
        file: null,
        previewUrl: '',
        title: '',
        description: '',
        isProcessing: false,
        isProcessed: false,
        videoId: '',
        processingStatus: '',
        watchUrl: '',
        videoTitle: '',
        videoDescription: '',
    });

    const updateUploadState = useCallback((updates) => {
        setUploadState(prev => ({ ...prev, ...updates }));
    }, []);

    return [uploadState, updateUploadState];
};

const getStoredVideos = () => {
    try {
        const stored = localStorage.getItem('videoLinks');
        if (!stored) return [];

        const videos = JSON.parse(stored);
        const now = Date.now();

        // Filter out expired videos
        const validVideos = videos.filter(video => video.expiresAt > now);

        // Update localStorage if any videos were expired
        if (validVideos.length !== videos.length) {
            localStorage.setItem('videoLinks', JSON.stringify(validVideos));
        }

        return validVideos;
    } catch (error) {
        console.error('Error reading stored videos:', error);
        return [];
    }
};

// Custom hook for socket connection
const useSocketConnection = (videoId, onStatusUpdate) => {
    const socketRef = useRef(null);

    useEffect(() => {
        if (!videoId) return;

        const socket = io(`https://${baseUrl}`, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5
        });

        socketRef.current = socket;
        socket.emit('joinVideoRoom', videoId);

        socket.on('videoStatus', onStatusUpdate);
        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            onStatusUpdate({ status: 'Connection error. Please try again.' });
        });

        return () => {
            socket.disconnect();
        };
    }, [videoId, onStatusUpdate]);
};

// Video Preview Component
const VideoPreview = ({ previewUrl, onClear, isProcessing, isProcessed }) => (
    <div className="h-full relative">
        {!isProcessed && !isProcessing && (
            <>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                    }}
                    className="absolute -top-3 -right-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full p-2
                    hover:from-red-600 hover:to-red-700 hover:scale-110
                    transition-all duration-300 shadow-lg hover:shadow-xl z-10
                    border-2 border-white backdrop-blur-sm"
                >
                    <X size={16} />
                </button>
                <video
                    src={previewUrl}
                    controls
                    className="h-full rounded-xl shadow-xl border-2 border-white/50 backdrop-blur-sm"
                />
            </>
        )}
    </div>
);

// Upload Form Component
const UploadForm = ({ title, description, onTitleChange, onDescriptionChange, onSubmit, disabled }) => (
    <>
        <div className="space-y-2 mt-4">
            <label htmlFor="title" className="block text-sm font-semibold text-slate-700">
                Title <span className="text-red-500">*</span>
            </label>
            <input
                type="text"
                id="title"
                required
                value={title}
                onChange={onTitleChange}
                className="mt-1 block w-full rounded-xl border-2 border-slate-200 shadow-sm
                focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20
                sm:text-sm bg-white/80 backdrop-blur-sm px-4 py-3 outline-none
                transition-all duration-300 hover:border-slate-300
                placeholder:text-slate-400"
                placeholder="Enter video title"
            />
        </div>

        <div className="space-y-2 mt-4">
            <label htmlFor="description" className="block text-sm font-semibold text-slate-700">
                Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
                id="description"
                value={description}
                onChange={onDescriptionChange}
                rows={4}
                className="mt-1 block w-full rounded-xl border-2 border-slate-200 shadow-sm
                focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20
                sm:text-sm bg-white/80 backdrop-blur-sm px-4 py-3 outline-none
                transition-all duration-300 hover:border-slate-300 resize-none
                placeholder:text-slate-400"
                placeholder="Enter video description"
            />
        </div>

        <button
            type="submit"
            disabled={disabled}
            className={`w-full mt-4 flex justify-center items-center py-4 px-6 border-none rounded-xl shadow-lg text-base font-semibold
            transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
            ${!disabled
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-slate-200/50'
            }`}
        >
            <span className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Upload Video</span>
            </span>
        </button>
    </>
);

// Processing Status Component
const ProcessingStatus = ({ status }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute top-2 left-2 w-16 h-16 border-2 border-indigo-300 rounded-full animate-pulse"></div>
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            {status}
        </h2>
        <p className="text-slate-600 text-center">
            This may take a few moments...
        </p>

    </div>
);

// Success Status Component
const SuccessStatus = ({ videoTitle, videoDescription, videoId, onCopyLink, copied }) => {
    const shareUrl = `${window.location.origin}/watch?v=${videoId}`;

    const saveLinkToLocalStorage = (videoLink, title, description) => {
        const now = Date.now();
        const existing = JSON.parse(localStorage.getItem('uploadedLinks')) || [];
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

        const updated = [
            {
                videoId,
                title,
                description,
                timestamp: now
            },
            ...existing.filter(item => now - item.timestamp < sevenDaysInMs)
        ];
        console.log('Saving link to localStorage:', updated);

        localStorage.setItem('uploadedLinks', JSON.stringify(updated));
    };


    useEffect(() => {
        saveLinkToLocalStorage(shareUrl, videoTitle, videoDescription);
    }, [shareUrl, videoTitle, videoDescription]);


    return (
        <div className="flex-1 flex flex-col justify-center p-8 space-y-6">
            <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Video Uploaded Successfully!
                </h2>
            </div>

            <div className="bg-gradient-to-br from-slate-50/80 to-blue-50/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50">
                {videoTitle && (
                    <div className="mb-3">
                        <span className="text-sm font-semibold text-slate-600">Title:</span>
                        <p className="text-slate-800 font-medium mt-1">{videoTitle}</p>
                    </div>
                )}
                {videoDescription && (
                    <div>
                        <span className="text-sm font-semibold text-slate-600">Description:</span>
                        <p className="text-slate-700 mt-1">{videoDescription}</p>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">Share Link:</label>
                <div className="flex items-center space-x-3">
                    <div className="flex-grow relative">
                        <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            className="w-full py-3 px-4 pr-12 bg-white/80 backdrop-blur-sm border-2 border-slate-200
                            rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500
                            text-slate-700 text-sm transition-all duration-300"
                        />
                        <button
                            onClick={onCopyLink}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2
                            text-slate-500 hover:text-blue-600 p-1 rounded-lg hover:bg-blue-50/80
                            transition-all duration-300"
                        >
                            {copied ? (
                                <Check size={20} className="text-green-600" />
                            ) : (
                                <Copy size={20} />
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};



const VideoHistoryModal = ({   onClose }) => {
    const [videos, setVideos] = useState([]);
    const [copiedId, setCopiedId] = useState(null);

    const formatTimeRemaining = (expiresAt) => {
        const now = Date.now();
        const remaining = expiresAt - now;
        const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
        const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

        if (days > 0) {
            return `${days}d ${hours}h remaining`;
        } else if (hours > 0) {
            return `${hours}h remaining`;
        } else {
            return 'Expires soon';
        }
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };



    const copyLink = async (videoId) => {
        const link = `${window.location.origin}/watch?v=${videoId}`;
        try {
            await navigator.clipboard.writeText(link);
            setCopiedId(videoId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    const getStoredVideos = () => {
        const stored = JSON.parse(localStorage.getItem('uploadedLinks')) || [];
        const now = Date.now();
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
        console.log('Stored videos:', stored);
        return stored
            .filter(item => now - item.timestamp < sevenDaysInMs)
            .map(item => ({
                videoId: item.videoId,
                videoTitle: item.title,
                videoDescription: item.description,
                addedAt: item.timestamp,
                expiresAt: item.timestamp + sevenDaysInMs
            }));
    };

    useEffect(() => {
        const storedVideos = getStoredVideos();
        setVideos(storedVideos);
        console.log('Loaded videos:', storedVideos);
    }, []);

const removeVideo = (videoId) => {
    const updatedVideos = videos.filter(video => video.videoId !== videoId);
    setVideos(updatedVideos);
    localStorage.setItem('uploadedLinks', JSON.stringify(updatedVideos));
    console.log('Removed video:', videoId, 'Updated videos:', updatedVideos);
}

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">

                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Your Videos</h2>
                            <p className="text-sm text-gray-500">{videos.length} video{videos.length !== 1 ? 's' : ''} saved</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onClose(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {videos.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">

                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No videos saved</h3>
                            <p className="text-gray-500">Upload your first video to see it here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {videos.map((video) => (
                                <div
                                    key={video.videoId}
                                    className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-all duration-300"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 truncate mb-1">
                                                {video.videoTitle || video.title || 'Untitled Video'}
                                            </h3>
                                            {(video.videoDescription || video.description) && (
                                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                                    {video.videoDescription || video.description}
                                                </p>
                                            )}
                                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                <div className="flex items-center space-x-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{formatDate(video.addedAt)}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{formatTimeRemaining(video.expiresAt)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2 ml-4">
                                            <button
                                                onClick={() => copyLink(video.videoId)}
                                                className="p-2 bg-white hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all duration-200 group"
                                                title="Copy link"
                                            >
                                                {copiedId === video.videoId ? (
                                                    <Check className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Copy className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                                                )}
                                            </button>

                                            <button
                                                onClick={() => window.open(`${window.location.origin}/watch?v=${video.videoId}`, '_blank')}
                                                className="p-2 bg-white hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-all duration-200 group"
                                                title="Open video"
                                            >
                                                <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                                            </button>

                                            <button
                                                onClick={() => removeVideo(video.videoId)}
                                                className="p-2 bg-white hover:bg-red-50 rounded-lg border border-gray-200 hover:border-red-200 transition-all duration-200 group"
                                                title="Remove from history"
                                            >
                                                <Trash2 className="w-4 h-4 text-gray-500 group-hover:text-red-600" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {videos.length > 0 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <p className="text-xs text-gray-500 text-center">
                            Video links expire automatically after 7 days
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};


function Upload() {
    const [
        { file, previewUrl, title, description, isProcessing, isProcessed, videoId,
            processingStatus, videoTitle, videoDescription },
        updateUploadState
    ] = useVideoUpload();

    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef(null);
    const [isModalOpen, setIsModalOpen] = useState(false);







    const handleStatusUpdate = useCallback((data) => {
        console.log('Received video status:', data);

        updateUploadState({
            processingStatus: data.status,
            videoTitle: data.title || '',
            videoDescription: data.description || '',
            watchUrl: data.url || '',
            isProcessing: ['Queued for Processing', 'Processing', 'Processing Complete. Publishing'].includes(data.status),
            isProcessed: data.status === 'Video is Live'
        });
    }, [updateUploadState]);

    useSocketConnection(videoId, handleStatusUpdate);

    const handleFileSelect = useCallback((event) => {
        const selectedFile = event.target.files?.[0];
        const MAX_FILE_SIZE = 50 * 1024 * 1024;
        if (selectedFile.size > MAX_FILE_SIZE) {
            alert('File size exceeds 50MB limit');
            event.target.value = '';
            return;
        }
        if (selectedFile && selectedFile.type.startsWith('video/')) {
            updateUploadState({
                file: selectedFile,
                previewUrl: URL.createObjectURL(selectedFile)
            });
        }
    }, [updateUploadState]);

    const uploadToPresignedUrl = async (presignedUrl, file) => {
        try {
            const response = await fetch(presignedUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            })
            return response.ok;
        } catch (error) {
            console.error('Error uploading to presigned URL:', error);
            return false;
        }
    };


    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !title) return;

        updateUploadState({ isProcessing: true, processingStatus: 'Initiating upload...' });

        try {
            const response = await fetch(`https://${baseUrl}/upload/upload-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description }),
            });

            if (!response.ok) throw new Error('Failed to get upload URL');

            const { videoID, presignedUrl } = await response.json();
            updateUploadState({ videoId: videoID, processingStatus: 'Uploading video...' });
            const uploadSuccess = await uploadToPresignedUrl(presignedUrl, file);

            if (!uploadSuccess) throw new Error('Failed to upload video');

            updateUploadState({ processingStatus: 'Upload complete. Waiting for processing...' });
        } catch (error) {
            console.error('Upload failed:', error);
            updateUploadState({
                isProcessing: false,
                processingStatus: 'Upload failed. Please try again.'
            });
        }
    };

    const clearVideo = useCallback(() => {
        updateUploadState({
            file: null,
            previewUrl: '',
            isProcessed: false,
            videoId: '',
            watchUrl: '',
            processingStatus: '',
            videoTitle: '',
            videoDescription: ''
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [updateUploadState]);

    const copyLink = async (e) => {
        e.stopPropagation();
        e.preventDefault()
        const link = `${window.location.origin}/watch?v=${videoId}`;

        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);

            setTimeout(() => window.location.replace(link), 1000);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy link:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Animated background elements */}
            <button
                onClick={()=> setIsModalOpen(true) }
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-green-600"
            >
                Upload History
            </button>
                {
                  isModalOpen &&
                <VideoHistoryModal
                    onClose={setIsModalOpen}

                />
                }
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradient Orbs */}


                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>

                {/* Animated Beams */}
                <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-pulse" style={{animationDelay: '0.3s'}}></div>
                <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent animate-pulse" style={{animationDelay: '0.7s'}}></div>
                <div className="absolute left-1/4 top-0 h-full w-px bg-gradient-to-b from-transparent via-indigo-400/20 to-transparent animate-pulse" style={{animationDelay: '0.5s'}}></div>
                <div className="absolute right-1/4 top-0 h-full w-px bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-pulse" style={{animationDelay: '0.9s'}}></div>

                {/* Floating Geometric Shapes */}
                <div className="absolute top-20 left-10 w-4 h-4 bg-blue-400/30 rotate-45 animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="absolute top-32 right-20 w-3 h-3 bg-purple-400/40 rounded-full animate-bounce" style={{animationDelay: '0.5s'}}></div>
                <div className="absolute bottom-40 left-20 w-2 h-8 bg-indigo-400/30 animate-pulse" style={{animationDelay: '0.8s'}}></div>
                <div className="absolute bottom-20 right-32 w-6 h-2 bg-cyan-400/30 animate-pulse" style={{animationDelay: '1.1s'}}></div>

                {/* Animated Grid Boxes */}
                <div className="absolute top-1/3 left-1/3 w-8 h-8 border border-blue-300/20 rotate-12 animate-spin-slow"></div>
                <div className="absolute bottom-1/3 right-1/3 w-6 h-6 border border-purple-300/20 -rotate-12 animate-spin-reverse"></div>

                {/* Diagonal Lines */}
                <div className="absolute top-0 left-0 w-24 h-px bg-gradient-to-r from-blue-400/20 to-transparent rotate-45 origin-left animate-pulse" style={{animationDelay: '0.4s'}}></div>
                <div className="absolute bottom-0 right-0 w-32 h-px bg-gradient-to-l from-purple-400/20 to-transparent -rotate-45 origin-right animate-pulse" style={{animationDelay: '0.6s'}}></div>

                {/* Hexagonal Pattern */}
                <div className="absolute top-16 right-16">
                    <div className="w-12 h-12 border border-indigo-300/20 transform rotate-45 animate-pulse" style={{animationDelay: '1s'}}></div>
                    <div className="absolute inset-1 w-10 h-10 border border-blue-300/15 transform rotate-45 animate-pulse" style={{animationDelay: '1.2s'}}></div>
                </div>

                {/* Circuit-like Lines */}
                <div className="absolute bottom-32 left-16">
                    <div className="w-16 h-px bg-cyan-400/20 animate-pulse" style={{animationDelay: '0.3s'}}></div>
                    <div className="w-px h-8 bg-cyan-400/20 ml-8 animate-pulse" style={{animationDelay: '0.6s'}}></div>
                    <div className="w-8 h-px bg-cyan-400/20 ml-8 animate-pulse" style={{animationDelay: '0.9s'}}></div>
                </div>

                {/* Constellation Dots */}
                <div className="absolute top-1/2 left-1/6 w-1 h-1 bg-blue-400/40 rounded-full animate-twinkle"></div>
                <div className="absolute top-1/3 left-2/3 w-1 h-1 bg-purple-400/40 rounded-full animate-twinkle" style={{animationDelay: '0.3s'}}></div>
                <div className="absolute top-2/3 left-1/2 w-1 h-1 bg-indigo-400/40 rounded-full animate-twinkle" style={{animationDelay: '0.6s'}}></div>

                {/* Connecting Lines Between Dots */}
                <svg className="absolute inset-0 w-full h-full" style={{zIndex: 1}}>
                    <line
                        x1="16.67%" y1="50%"
                        x2="66.67%" y2="33.33%"
                        stroke="rgba(99, 102, 241, 0.1)"
                        strokeWidth="1"
                        className="animate-pulse"
                        style={{animationDelay: '0.4s'}}
                    />
                    <line
                        x1="66.67%" y1="33.33%"
                        x2="50%" y2="66.67%"
                        stroke="rgba(147, 51, 234, 0.1)"
                        strokeWidth="1"
                        className="animate-pulse"
                        style={{animationDelay: '0.7s'}}
                    />
                </svg>

                {/* Matrix-style Vertical Lines */}
                <div className="absolute left-8 top-0 h-full w-px bg-gradient-to-b from-blue-400/10 via-blue-400/20 to-blue-400/10 animate-pulse" style={{animationDelay: '1.5s'}}></div>
                <div className="absolute right-8 top-0 h-full w-px bg-gradient-to-b from-purple-400/10 via-purple-400/20 to-purple-400/10 animate-pulse" style={{animationDelay: '1.8s'}}></div>

                {/* Orbiting Elements */}
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2">
                    <div className="w-32 h-32 border border-blue-300/10 rounded-full animate-spin-slow"></div>
                    <div className="absolute top-2 left-2 w-28 h-28 border border-purple-300/10 rounded-full animate-spin-reverse"></div>
                </div>

                {/* Scattered Geometric Elements */}
                <div className="absolute top-3/4 left-1/4 w-3 h-3 bg-gradient-to-br from-blue-400/30 to-indigo-400/30 rounded-sm rotate-12 animate-bounce" style={{animationDelay: '1.2s'}}></div>
                <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-gradient-to-br from-purple-400/30 to-pink-400/30 rounded-full animate-bounce" style={{animationDelay: '1.6s'}}></div>

                {/* Glowing Nodes */}
                <div className="absolute top-40 left-40 w-2 h-2 bg-blue-400/60 rounded-full shadow-lg shadow-blue-400/40 animate-pulse" style={{animationDelay: '2s'}}></div>
                <div className="absolute bottom-40 right-40 w-2 h-2 bg-purple-400/60 rounded-full shadow-lg shadow-purple-400/40 animate-pulse" style={{animationDelay: '2.3s'}}></div>
            </div>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="max-w-2xl mx-auto relative">
                {/* Glassmorphism container */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 transform hover:scale-[1.01] transition-all duration-300">
                    {/* Header with gradient text */}
                    <div className="text-center mb-8 space-y-2">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent animate-fade-in">
                            Upload Your Video
                        </h1>
                        <p className="text-slate-600 text-sm font-medium">
                            Transform your content with our powerful video platform
                        </p>
                    </div>

                    <form onSubmit={handleUpload} className="space-y-6">
                        <div className="relative min-h-[400px]">
                            {/* Upload area */}
                            <div
                                className={`absolute inset-0 border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer 
                        bg-gradient-to-br from-slate-50/50 to-blue-50/50 backdrop-blur-sm
                        hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50/70 hover:to-indigo-50/70 
                        hover:shadow-lg hover:scale-[1.02]
                        transition-all duration-500 ease-in-out group
                        ${isProcessing || isProcessed ? 'pointer-events-none opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                                onClick={() => !isProcessed && !isProcessing && fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="video/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    disabled={isProcessed || isProcessing}
                                />

                                {previewUrl ? (
                                    <VideoPreview
                                        previewUrl={previewUrl}
                                        onClear={clearVideo}
                                        isProcessing={isProcessing}
                                        isProcessed={isProcessed}
                                    />
                                ) : (
                                    <div className="text-center space-y-4 group-hover:scale-105 transition-transform duration-300">
                                        <div className="relative">
                                            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                                                <UploadIcon className="h-8 w-8 text-white animate-bounce" />
                                            </div>
                                            {/* Floating animation rings */}
                                            <div className="absolute inset-0 w-16 h-16 mx-auto border-2 border-blue-400/30 rounded-2xl animate-ping"></div>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-lg font-semibold text-slate-700 group-hover:text-blue-600 transition-colors duration-300">
                                                Click to upload or drag & drop
                                            </p>
                                            <p className="text-sm text-slate-500 bg-slate-100/50 px-3 py-1 rounded-full inline-block">
                                                MP4, WebM, or Ogg • Max 50MB
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Processing/Success overlay */}
                            <div
                                className={`absolute inset-0 bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-sm rounded-xl border border-slate-200/50 shadow-xl
                        transform transition-all duration-700 ease-out flex flex-col
                        ${isProcessing || isProcessed ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95 pointer-events-none'}`}
                            >
                                {previewUrl && (
                                    <div className="w-full h-48 mb-6 relative overflow-hidden rounded-lg">
                                        <video
                                            src={previewUrl}
                                            className="w-full h-full object-cover rounded-lg shadow-md"
                                            autoPlay={false}
                                            controls={false}
                                            muted
                                            loop
                                            playsInline
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
                                    </div>
                                )}

                                {isProcessing ? (
                                    <ProcessingStatus status={processingStatus} />
                                ) : isProcessed && (
                                    <SuccessStatus
                                        videoTitle={videoTitle}
                                        videoDescription={videoDescription}
                                        videoId={videoId}
                                        onCopyLink={copyLink}
                                        copied={copied}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Upload form */}
                        {!isProcessing && !isProcessed && (
                            <div className={`transform transition-all duration-500 ${!isProcessing && !isProcessed ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                                <UploadForm
                                    title={title}
                                    description={description}
                                    onTitleChange={(e) => updateUploadState({ title: e.target.value })}
                                    onDescriptionChange={(e) => updateUploadState({ description: e.target.value })}
                                    onSubmit={handleUpload}
                                    disabled={!file || !title}
                                />
                            </div>
                        )}
                    </form>
                </div>

                {/* Floating action indicator */}
                <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-150"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-300"></div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.8s ease-out;
                }
            `}</style>
        </div>
    );
}

export default Upload;

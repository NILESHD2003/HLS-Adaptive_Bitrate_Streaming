import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload as UploadIcon, X, Copy, Check } from 'lucide-react';
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
    <div className="w-full relative">
        {!isProcessed && !isProcessing && (
            <>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                    }}
                    className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                    <X size={16} />
                </button>
                <video src={previewUrl} controls className="w-full rounded-lg" />
            </>
        )}
    </div>
);

// Upload Form Component
const UploadForm = ({ title, description, onTitleChange, onDescriptionChange, onSubmit, disabled }) => (
    <>
        <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
            </label>
            <input
                type="text"
                id="title"
                required
                value={title}
                onChange={onTitleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white border px-3 py-2 outline-none"
                placeholder="Enter video title"
            />
        </div>

        <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
                id="description"
                value={description}
                onChange={onDescriptionChange}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white border px-3 py-2 outline-none"
                placeholder="Enter video description"
            />
        </div>

        <button
            type="submit"
            disabled={disabled}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
        ${!disabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'} transition-colors duration-200`}
        >
            Upload Video
        </button>
    </>
);

// Processing Status Component
const ProcessingStatus = ({ status }) => (
    <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{status}</h2>
        <p className="text-gray-600">This may take a few moments...</p>
    </div>
);

// Success Status Component
const SuccessStatus = ({ videoTitle, videoDescription, videoId, onCopyLink, copied }) => {
    const shareUrl = `${window.location.origin}/watch?v=${videoId}`;

    return (
        <div className="flex-1 flex flex-col justify-center p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Video Uploaded Successfully!</h2>
            {videoTitle && <p className="text-gray-700 mb-2">Title: {videoTitle}</p>}
            {videoDescription && <p className="text-gray-600 mb-4">Description: {videoDescription}</p>}
            <div className="flex items-center space-x-4">
                <div className="flex-grow relative">
                    <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="w-full py-2 px-4 pr-12 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                        onClick={onCopyLink}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                        {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                    </button>
                </div>
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
            });
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
                <h1 className="text-3xl font-bold text-gray-900 text-center mb-8">
                    Upload Your Video
                </h1>

                <form onSubmit={handleUpload} className="space-y-6">
                    <div className="relative min-h-[400px]">
                        <div
                            className={`absolute inset-0 border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-all duration-500 ease-in-out
                ${isProcessing || isProcessed ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
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
                                <div className="text-center">
                                    <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                                    <p className="mt-2 text-sm text-gray-600">
                                        Click to upload
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        MP4, WebM, or Ogg (Max 50MB)
                                    </p>
                                </div>
                            )}
                        </div>

                        <div
                            className={`absolute inset-0 bg-white rounded-lg transform transition-all duration-500 ease-in-out flex flex-col
                ${isProcessing || isProcessed ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
                        >
                            {previewUrl && (
                                <div className="w-full h-48">
                                    <video
                                        src={previewUrl}
                                        className="w-full h-full object-cover rounded-lg"
                                        autoPlay={false}
                                        controls={false}
                                        muted
                                        loop
                                        playsInline
                                    />
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

                    {!isProcessing && !isProcessed && (
                        <UploadForm
                            title={title}
                            description={description}
                            onTitleChange={(e) => updateUploadState({ title: e.target.value })}
                            onDescriptionChange={(e) => updateUploadState({ description: e.target.value })}
                            onSubmit={handleUpload}
                            disabled={!file || !title}
                        />
                    )}
                </form>
            </div>
        </div>
    );
}

export default Upload;

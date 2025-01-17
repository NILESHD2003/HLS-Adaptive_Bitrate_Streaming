import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import 'plyr/dist/plyr.css';
import {VideoPlayer} from "./VideoPlayer.jsx";

const baseUrl = import.meta.env.VITE_SERVER_URL;

function SkeletonPulse(className) {
    return <div className={`animate-pulse bg-gray-800 rounded-md ${className}`} />;
}

function Watch() {
    const [searchParams] = useSearchParams();
    const videoId = searchParams.get('v');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [videoData, setVideoData] = useState(null);

    useEffect(() => {
        const fetchVideoData = async () => {
            if (!videoId) {
                setError({ status: 404, message: 'Video ID is missing' });
                setLoading(false);
                return;
            }

            try {
                const response = await fetch(`https://${baseUrl}/watch?videoId=${videoId}`);
                const data = await response.json();

                if (!response.ok) {
                    throw { status: response.status, message: data.message };
                }

                if (data.success) {
                    setVideoData(data.data);
                } else {
                    throw { status: 404, message: data.message };
                }
            } catch (err) {
                setError({
                    status: err.status || 500,
                    message: err.message || 'Something went wrong. Please try again later.'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchVideoData();
    }, [videoId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="relative">
                        <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full border-4 border-gray-700 border-t-gray-600 animate-spin" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 space-y-6">
                        <div className="space-y-3">
                            <SkeletonPulse className="h-8 w-3/4" />
                            <div className="flex items-center space-x-4">
                                <SkeletonPulse className="h-4 w-24" />
                                <SkeletonPulse className="h-4 w-32" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <SkeletonPulse className="h-4 w-full" />
                            <SkeletonPulse className="h-4 w-5/6" />
                            <SkeletonPulse className="h-4 w-4/6" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center px-4">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {error.status === 404 ? 'Video Not Found' : 'Something Went Wrong'}
                    </h1>
                    <p className="text-gray-400 max-w-md mx-auto">
                        {error.message}
                    </p>
                    {error.status === 500 && (
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!videoData) return null;

    return (
        <div className="min-h-screen bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <VideoPlayer src={videoData.url}></VideoPlayer>
                </div>

                <div className="mt-6">
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {videoData.title}
                    </h1>
                    <p className="text-gray-400">
                        {videoData.description}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Watch;

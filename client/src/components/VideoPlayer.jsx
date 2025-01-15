import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Settings, Maximize, Minimize } from 'lucide-react';

export function VideoPlayer({ src }) {
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [qualities, setQualities] = useState([]);
    const [currentQuality, setCurrentQuality] = useState(-1);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [buffered, setBuffered] = useState([]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (Hls.isSupported()) {
            const hls = new Hls({
                capLevelToPlayerSize: true,
                autoLevelCapping: -1,
                maxBufferLength: 10,
                maxMaxBufferLength: 10,
                maxBufferSize: 2000000,
                maxBufferHole: 0.5,
                highBufferWatchdogPeriod: 2,
                lowBufferWatchdogPeriod: 0.5,
                nudgeMaxRetry: 3,
                maxFragLookUpTolerance: 0.25,
                liveSyncDurationCount: 2,
            });

            hlsRef.current = hls;
            hls.loadSource(src);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                const qualityLevels = data.levels.map((level, index) => ({
                    height: level.height,
                    bitrate: level.bitrate,
                    level: index
                }));
                setQualities(qualityLevels);
                setCurrentQuality(hls.currentLevel);

                video.play().catch(() => {
                    console.log('Playback failed, probably needs user interaction first');
                });
            });

            hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                setCurrentQuality(data.level);
            });

            return () => {
                hls.destroy();
            };
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
        }
    }, [src]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const timeUpdate = () => {
            if (!isDragging) {
                setCurrentTime(video.currentTime);
            }
        };

        const durationChange = () => {
            setDuration(video.duration);
        };

        const progressUpdate = () => {
            const bufferedRanges = [];
            for (let i = 0; i < video.buffered.length; i++) {
                bufferedRanges.push({
                    start: video.buffered.start(i),
                    end: video.buffered.end(i)
                });
            }
            setBuffered(bufferedRanges);
        };

        video.addEventListener('timeupdate', timeUpdate);
        video.addEventListener('durationchange', durationChange);
        video.addEventListener('progress', progressUpdate);

        return () => {
            video.removeEventListener('timeupdate', timeUpdate);
            video.removeEventListener('durationchange', durationChange);
            video.removeEventListener('progress', progressUpdate);
        };
    }, [isDragging]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === containerRef.current);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        if (!isFullscreen) {
            try {
                await containerRef.current.requestFullscreen();
            } catch (err) {
                console.error('Error attempting to enable fullscreen:', err);
            }
        } else {
            try {
                await document.exitFullscreen();
            } catch (err) {
                console.error('Error attempting to exit fullscreen:', err);
            }
        }
    };

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(!isMuted);
        }
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            setVolume(newVolume);
            setIsMuted(newVolume === 0);
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const newTime = pos * duration;
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const handleSeekStart = () => {
        setIsDragging(true);
    };

    const handleSeekEnd = () => {
        setIsDragging(false);
    };

    const changeQuality = (level) => {
        if (hlsRef.current) {
            hlsRef.current.currentLevel = level;
            setShowQualityMenu(false);
        }
    };

    const formatQuality = (quality) => {
        return `${quality.height}p`;
    };

    return (
        <div ref={containerRef} className="relative group">
            <video
                ref={videoRef}
                className="w-full rounded-lg shadow-lg"
                playsInline
                controls={false}
            />
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="space-y-2">
                    <div className="relative">
                        {/* Buffered regions */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gray-600 rounded">
                            {buffered.map((range, index) => (
                                <div
                                    key={index}
                                    className="absolute h-full bg-white/30"
                                    style={{
                                        left: `${(range.start / duration) * 100}%`,
                                        width: `${((range.end - range.start) / duration) * 100}%`
                                    }}
                                />
                            ))}
                        </div>
                        {/* Progress bar */}
                        <div
                            className="relative h-1 w-full bg-transparent rounded cursor-pointer"
                            onClick={handleSeek}
                            onMouseDown={handleSeekStart}
                            onMouseUp={handleSeekEnd}
                        >
                            <div
                                className="h-full bg-blue-500 rounded relative"
                                style={{ width: `${(currentTime / duration) * 100}%` }}
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full transform translate-x-1/2" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={togglePlay}
                            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                            {isPlaying ? (
                                <Pause className="w-6 h-6 text-white" />
                            ) : (
                                <Play className="w-6 h-6 text-white" />
                            )}
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleMute}
                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            >
                                {isMuted ? (
                                    <VolumeX className="w-6 h-6 text-white" />
                                ) : (
                                    <Volume2 className="w-6 h-6 text-white" />
                                )}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>

                        <span className="text-white text-sm">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>

                        <div className="relative ml-auto flex items-center gap-4">
                            <button
                                onClick={toggleFullscreen}
                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                            >
                                {isFullscreen ? (
                                    <Minimize className="w-6 h-6 text-white" />
                                ) : (
                                    <Maximize className="w-6 h-6 text-white" />
                                )}
                            </button>

                            <button
                                onClick={() => setShowQualityMenu(!showQualityMenu)}
                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center gap-2"
                            >
                                <Settings className="w-6 h-6 text-white" />
                                <span className="text-white text-sm">
                                    {currentQuality >= 0 && qualities[currentQuality]
                                        ? formatQuality(qualities[currentQuality])
                                        : 'Auto'}
                                </span>
                            </button>

                            {showQualityMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-lg overflow-hidden">
                                    <div className="py-1">
                                        <button
                                            onClick={() => changeQuality(-1)}
                                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-800 ${
                                                currentQuality === -1 ? 'bg-blue-500/20 text-blue-400' : 'text-white'
                                            }`}
                                        >
                                            Auto
                                        </button>
                                        {qualities.map((quality) => (
                                            <button
                                                key={quality.level}
                                                onClick={() => changeQuality(quality.level)}
                                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-800 ${
                                                    currentQuality === quality.level ? 'bg-blue-500/20 text-blue-400' : 'text-white'
                                                }`}
                                            >
                                                {formatQuality(quality)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default VideoPlayer;
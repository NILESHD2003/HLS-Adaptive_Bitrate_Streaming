const socketIo = require('socket.io');
let io;

const VIDEO_STATES = {
    QUEUED: 'Queued for Processing',
    PROCESSING: 'Processing',
    PROCESSING_COMPLETE: 'Processing Complete. Publishing',
    LIVE: 'Video is Live',
    FAILED: 'Processing Failed'
};

const videoStateTracker = new Map();

const getStateSequence = (state) => {
    const sequence = {
        [VIDEO_STATES.QUEUED]: 1,
        [VIDEO_STATES.PROCESSING]: 2,
        [VIDEO_STATES.PROCESSING_COMPLETE]: 3,
        [VIDEO_STATES.LIVE]: 4,
        [VIDEO_STATES.FAILED]: 5
    };
    return sequence[state] || 0;
};

const initializeSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        // console.log('[Socket] New client connected');

        socket.on('joinVideoRoom', async (videoId) => {
            const roomName = `video-${videoId}`;
            await socket.join(roomName);
            // console.log(`[Socket] Client joined room: ${roomName}`);

            const lastState = videoStateTracker.get(videoId);
            if (lastState) {
                socket.emit('videoStatus', {
                    ...lastState,
                    isRecap: true
                });
            }
        });

        socket.on('disconnect', () => {
            // console.log('[Socket] Client disconnected');
        });
    });

    return io;
};

const emitVideoStatus = async (videoId, status, additionalData = {}) => {
    if (!io) {
        console.error('[Socket] IO instance not initialized!');
        return;
    }

    const currentSequence = getStateSequence(status);
    const lastState = videoStateTracker.get(videoId);
    const lastSequence = lastState ? getStateSequence(lastState.status) : 0;

    if (currentSequence < lastSequence && status !== VIDEO_STATES.FAILED) {
        console.log(`[Socket] Skipping out-of-sequence update for ${videoId}: ${status}`);
        return;
    }

    const statusData = {
        videoId,
        status,
        sequence: currentSequence,
        timestamp: new Date(),
        ...additionalData
    };

    videoStateTracker.set(videoId, statusData);

    await new Promise(resolve => setTimeout(resolve, 100));

    // console.log(`[Socket] Emitting status for video ${videoId}:`, status);
    io.to(`video-${videoId}`).emit('videoStatus', statusData);
};

setInterval(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [videoId, state] of videoStateTracker.entries()) {
        if (new Date(state.timestamp) < oneHourAgo) {
            videoStateTracker.delete(videoId);
        }
    }
}, 60 * 60 * 1000);

module.exports = { initializeSocket, emitVideoStatus, VIDEO_STATES };
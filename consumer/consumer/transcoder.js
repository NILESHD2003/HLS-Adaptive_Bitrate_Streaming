const { exec } = require('child_process');
// const queueClient = require('../config/queueClient.config');
const Video = require('../models/video.model');
require('dotenv').config();
const { updateVideoStatus } = require('../grpcClient');
// const { emitVideoStatus } = require('../utils/socketManager.utils');
const redisClient = require('../config/redisClient.config');

const queueId = process.env.QUEUE_ID;

const removeContainer = async (containerName) => {
    const removeCommand = `docker rm -f ${containerName}`;
    try {
        await exec(removeCommand);
        console.log(`Container ${containerName} removed successfully.`);
    } catch (error) {
        console.error(`Failed to remove container ${containerName}:`, error.message);
    }
};

const isVideoAlreadyProcessed = async (videoId) => {
    try {
        const video = await Video.findOne({ slug: videoId });
        return video && video.state === 'Processing Complete';
    } catch (error) {
        console.error('Error checking video processing status:', error);
        return false;
    }
};

const PROCESSING_TIMEOUT = 20 * 60 * 1000;

const execPromise = (command, timeout = PROCESSING_TIMEOUT) => {
    return new Promise((resolve, reject) => {
        const process = exec(command, (error, stdout, stderr) => {
            if (stderr) {
                const errorMessage = stderr.trim();
                console.error('Process stderr:', errorMessage);
                reject(new Error(errorMessage.replace('ERROR: ', '')));
                return;
            }

            if (error) {
                console.error('Process error:', error);
                reject(new Error(`Process failed with exit code ${error.code}`));
                return;
            }

            const output = stdout.trim();
            if (output === 'SUCCESS') {
                resolve(output);
            } else {
                reject(new Error('Process completed without success confirmation'));
            }
        });

        const timeoutId = setTimeout(() => {
            process.kill();
            reject(new Error('Process timed out after ' + (timeout / 1000) + ' seconds'));
        }, timeout);

        process.on('close', (code) => {
            clearTimeout(timeoutId);
        });
    });
};

const processMessage = async (message) => {
    let messageContent;

    try {
        messageContent = JSON.parse(message);
        // console.log('Processing message content:', messageContent);

        if (await isVideoAlreadyProcessed(messageContent.videoID)) {
            console.log(`Video ${messageContent.videoID} was already successfully processed. Skipping.`);
            // await queueClient.deleteMessage({
            //     queueId: queueId,
            //     messageReceipt: message.receipt
            // });
            return;
        }

        await Video.findOneAndUpdate(
            { slug: messageContent.videoID },
            {
                state: 'Processing',
                processingStartTime: new Date(),
                error: null
            },
            { new: true }
        );
        await updateVideoStatus(messageContent.videoID, 'Processing');
        // const dockerCommand = `docker run --cpus="2.0" video-processor "${messageContent.originalUrl}" "${messageContent.uploadUrl}" "${messageContent.videoID}"`;
        const containerName = `video-processor-${messageContent.videoID}`;
        const dockerCommand = `sudo docker run --platform linux/arm64 --name ${containerName} video-processor "${messageContent.originalUrl}" "${messageContent.uploadUrl}" "${messageContent.videoID}"`;

        // const dockerCommand = `docker run --name ${containerName} video-processor "${messageContent.originalUrl}" "${messageContent.uploadUrl}" "${messageContent.videoID}"`;

        // console.log('Starting processing for video:', messageContent.videoID);

        try {
            await execPromise(dockerCommand);
            // console.log('Processing completed successfully for video:', messageContent.videoID);
            removeContainer(containerName);
            await Video.findOneAndUpdate(
                { slug: messageContent.videoID },
                {
                    state: 'Processing Complete. Publishing.',
                }
            );
            await updateVideoStatus(messageContent.videoID, 'Processing Complete. Publishing.');
            // await queueClient.deleteMessage({
            //     queueId: queueId,
            //     messageReceipt: message.receipt
            // });
            // console.log(`Deleted message with receipt: ${message.receipt}`);

        } catch (error) {
            console.error('Processing failed for video:', messageContent.videoID, error.message);
            await updateVideoStatus(messageContent.videoID, 'Processing Failed', {
                error: error.message
            });
            await Video.findOneAndUpdate(
                { slug: messageContent.videoID },
                {
                    state: 'Processing Failed',
                    processingEndTime: new Date(),
                    error: error.message
                }
            );
            throw error;
        }

    } catch (error) {
        console.error('Error during message processing:', error);
        throw error;
    }
};

const transcoder = async () => {
    console.log("Starting Redis queue consumer...");
    let isRunning = true;

    process.on('SIGINT', () => {
        console.log('Shutting down Redis queue consumer...');
        isRunning = false;
    });

    while (isRunning) {
        try {
            // const receiveMessageDetails = {
            //     queueId: queueId,
            //     timeoutInSeconds: 30,
            //     maxNumberOfMessages: 1
            // };

            // const response = await queueClient.getMessages(receiveMessageDetails);
            // const messages = response.getMessages.messages;

            // if (messages && messages.length > 0) {
            //     // console.log('Found message, processing...');
            //     await processMessage(messages[0]);
            // } else {
            //     await new Promise(resolve => setTimeout(resolve, 5000));
            // }

            const message = await redisClient.lpop('hls:videoProcessingQueue');

            if (message) {
                await processMessage(message);
            } else {
                // console.log('No messages in the queue, waiting...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        } catch (error) {
            console.error('Error consuming queue:', error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    console.log("Queue consumer stopped.");
};

module.exports = { transcoder };
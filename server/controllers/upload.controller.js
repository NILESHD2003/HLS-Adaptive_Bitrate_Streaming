const Video = require("../models/video.model");
const { generatePresignedUrl_Upload, generatePresignedUrl_Download } = require("../utils/generatePresignedUrls.utils");
const queueClient = require('../config/queueClient.config');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { emitVideoStatus } = require('../utils/socketManager.utils');

const bucketName = process.env.BUCKET_NAME;
const namespaceName = process.env.NAMESPACE_NAME;

exports.uploadUrl = async (req, res) => {
    try {
        const filename = "request.mp4";

        const { videoID, presignedUrl } = await generatePresignedUrl_Upload({
            bucketName: bucketName,
            namespaceName: namespaceName,
            filename: filename
        });

        const video = await Video.create({
            title: req.body.title,
            description: req.body.description || null,
            slug: videoID
        })

        res.json({
            videoID,
            presignedUrl
        });
    } catch (error) {
        console.error("Error generating upload URL:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.uploadSuccessful = async (req, res) => {
    try {
        const { data } = req.body;

        const { presignedUrlDownload } = await generatePresignedUrl_Download(
            bucketName,
            namespaceName,
            data.resourceName
        );


        const slug = data.resourceName.split('/')[0];


        const video = await Video.findOneAndUpdate({ slug: slug }, { state: 'Queued for Processing', orgVideoUrl: presignedUrlDownload });

        emitVideoStatus(slug, 'Queued for Processing', {
            title: video.title,
            description: video.description
        });


        const parFilePath = './par.json';
        let uploadUrl = null;

        const waitForUploadUrl = new Promise((resolve) => {
            const interval = setInterval(() => {
                if (fs.existsSync(parFilePath)) {
                    const parData = JSON.parse(fs.readFileSync(parFilePath));
                    if (parData.fullUrl) {
                        uploadUrl = parData.fullUrl;
                        clearInterval(interval);
                        resolve(uploadUrl);
                    }
                }
            }, 1000);
        });

        await waitForUploadUrl;

        const queueId = process.env.QUEUE_ID;

        const resp = await queueClient.putMessages({
            queueId: queueId,
            putMessagesDetails: {
                messages: [{
                    content: JSON.stringify({
                        videoID: slug,
                        originalUrl: presignedUrlDownload,
                        uploadUrl: uploadUrl
                    })
                }]
            }
        });

        // console.log('Queue Response:', resp);

        return res.status(200).json({
            success: true,
            message: 'Notification Acknowledged'
        });
    } catch (error) {
        console.error('Error occurred while adding metadata or processing:', error);

        return res.status(500).json({
            success: false,
            message: 'Something went wrong, please try again later.'
        });
    }
};
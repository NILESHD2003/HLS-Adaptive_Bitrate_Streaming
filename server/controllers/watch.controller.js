const Video = require("../models/video.model");
const {generatePresignedUrl_FolderAccess} = require("../utils/generatePresignedUrls.utils");
require("dotenv").config();
const { emitVideoStatus } = require('../utils/socketManager.utils');

exports.transcodeSuccessful = async (req, res) => {
    try{
        const {data} = req.body;

        const bucketName = process.env.BUCKET_NAME_PROCESSED;
        const namespaceName = process.env.NAMESPACE_NAME;

        const { presignedUrlFolder, folderPath} = await generatePresignedUrl_FolderAccess(
            bucketName,
            namespaceName,
            data.resourceName.split('/')[0]
        );

        const finalUrl = `${presignedUrlFolder}${folderPath}/master.m3u8`;

        console.log(`Finished ${finalUrl}`);

        await Video.findOneAndUpdate({slug: folderPath}, {url: finalUrl, state: 'Video is Live'});

        emitVideoStatus(folderPath, 'Video is Live', {
            url: finalUrl
        });

        return res.status(200).json({
            success: true,
            message: 'Notification Acknowledged'
        });
    }catch (error) {
        return res.status(500).send({
            status: 500,
            message: error.message,
        })
    }
}

exports.watch = async (req, res) => {
    try{
        const videoId = req.query.videoId;

        const video = await Video.findOne({slug: videoId});

        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'The requested video may have been removed after 7 days',
                data: {}
            })
        }

        return res.status(200).json({
            success: true,
            data: {
                videoId: videoId,
                title: video.title,
                description: video.description,
                url: video.url
            }
        })
    }catch(error){
        console.error(error);
        return res.status(500).send({
            success: false,
            message: error.message,
        })
    }
}
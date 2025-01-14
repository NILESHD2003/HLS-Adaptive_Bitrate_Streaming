const { v7 } = require('uuid');
const objectStorageClient = require('../config/objectStorageClient.config');

const generatePresignedUrl_Upload = async ({bucketName, namespaceName, filename, expiry}) => {
    const videoID = v7();

    const objectName = filename ? `${videoID}/${filename}` : `${videoID}/`;

    if(!expiry) {
        expiry = 1;
    }

    // Generate presigned URL for the object
    const response = await objectStorageClient.createPreauthenticatedRequest({
        namespaceName: namespaceName,
        bucketName: bucketName,
        createPreauthenticatedRequestDetails: {
            name: `UploadRequest-${videoID}`,
            accessType: "ObjectWrite",
            objectName: objectName,
            timeExpires: new Date(Date.now() + 3600 * 1000 * expiry).toISOString(),
        },
    });

    return {
        videoID,
        presignedUrl: response.preauthenticatedRequest.fullPath,
    };
};

const generatePresignedUrl_Download = async (bucketName, namespaceName, videoID) => {
    const objectName = `${videoID}`;

    const response = await objectStorageClient.createPreauthenticatedRequest({
        namespaceName: namespaceName,
        bucketName: bucketName,
        createPreauthenticatedRequestDetails: {
            name: `DownloadRequest-${videoID}`,
            accessType: "ObjectRead",
            objectName: objectName,
            timeExpires: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        },
    });

    return {
        videoID,
        presignedUrlDownload: response.preauthenticatedRequest.fullPath,
    };
};

const generatePresignedUrl_FolderAccess = async (bucketName, namespaceName, folderPath) => {
    const normalizedFolderPath = folderPath.replace(/^\/+|\/+$/g, '') + '/';

    const response = await objectStorageClient.createPreauthenticatedRequest({
        namespaceName: namespaceName,
        bucketName: bucketName,
        createPreauthenticatedRequestDetails: {
            name: `FolderAccessRequest-${folderPath.replace(/\//g, '-')}`,
            accessType: "AnyObjectRead",
            objectName: normalizedFolderPath,
            timeExpires: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            bucketListingAction: "ListObjects"
        },
    });

    return {
        folderPath,
        presignedUrlFolder: response.preauthenticatedRequest.fullPath,
    };
};


module.exports = { generatePresignedUrl_Upload, generatePresignedUrl_Download, generatePresignedUrl_FolderAccess };

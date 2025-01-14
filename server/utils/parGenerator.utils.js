const common = require('oci-common');
const objectStorage = require('oci-objectstorage');
const fs = require('fs');
const cron = require('node-cron');
require('dotenv').config();

const provider = new common.ConfigFileAuthenticationDetailsProvider();
const client = new objectStorage.ObjectStorageClient({
    authenticationDetailsProvider: provider
});

const region = provider.getRegion().regionId;

const config = {
    namespaceName: process.env.NAMESPACE_NAME,
    bucketName: process.env.BUCKET_NAME_PROCESSED,
    parFilePath: './par.json',
    region: region
};

async function generatePAR() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);

    const parDetails = {
        name: `bucket-upload-par-${Date.now()}`,
        accessType: "AnyObjectWrite",
        bucketListingAction: "Deny",
        timeExpires: tomorrow
    };

    try {
        const createParRequest = {
            namespaceName: config.namespaceName,
            bucketName: config.bucketName,
            createPreauthenticatedRequestDetails: parDetails
        };

        const response = await client.createPreauthenticatedRequest(createParRequest);
        const parData = {
            accessUri: response.preauthenticatedRequest.accessUri,
            fullUrl: `https://objectstorage.${config.region}.oraclecloud.com${response.preauthenticatedRequest.accessUri}`,
            timeExpires: response.preauthenticatedRequest.timeExpires,
            id: response.preauthenticatedRequest.id,
            generatedAt: new Date().toISOString()
        };

        // console.log('Generated PAR URL:', parData.fullUrl);

        fs.writeFileSync(config.parFilePath, JSON.stringify(parData, null, 2));
        // console.log('New PAR generated and saved:', parData);
        return parData;
    } catch (error) {
        console.error('Error generating PAR:', error);
        console.error('Current config:', {
            region: config.region,
            namespaceName: config.namespaceName,
            bucketName: config.bucketName
        });
        throw error;
    }
}

function getCurrentPAR() {
    try {
        if (fs.existsSync(config.parFilePath)) {
            const parData = JSON.parse(fs.readFileSync(config.parFilePath));
            const expiryTime = new Date(parData.timeExpires);

            if (expiryTime > new Date()) {
                return parData;
            }
        }
        return null;
    } catch (error) {
        console.error('Error reading PAR file:', error);
        return null;
    }
}

function schedulePARGeneration() {
    if (!getCurrentPAR()) {
        generatePAR().catch(console.error);
    }

    cron.schedule('0 2 * * *', async () => {
        try {
            await generatePAR();
            console.log('Scheduled PAR generation completed');
        } catch (error) {
            console.error('Scheduled PAR generation failed:', error);
        }
    });
}

function getConfig() {
    return {
        ...config,
        region: config.region
    };
}

module.exports = {
    generatePAR,
    getCurrentPAR,
    schedulePARGeneration,
    getConfig
};
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.resolve(__dirname, './protos/video_service.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

require('dotenv').config();
const grpcAddress = process.env.GRPC_ADDRESS;

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const videoservice = protoDescriptor.videoservice;

function createClient(serverAddress = grpcAddress) {
    return new videoservice.VideoStatusService(
        serverAddress,
        grpc.credentials.createInsecure()
    );
}

async function updateVideoStatus(videoId, status, additionalData = {}) {
    const client = createClient();

    return new Promise((resolve, reject) => {
        client.emitVideoStatus({
            video_id: videoId,
            status: status,
            additional_data: additionalData
        }, (error, response) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(response);
        });
    });
}

module.exports = { createClient, updateVideoStatus };
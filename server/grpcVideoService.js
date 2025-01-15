const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { emitVideoStatus } = require('./utils/socketManager.utils');

const PROTO_PATH = path.resolve(__dirname, './protos/video_service.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const videoservice = protoDescriptor.videoservice;

class VideoStatusService {
    async emitVideoStatus(call, callback) {
        try {
            const { video_id, status, additional_data } = call.request;

            // Convert additional_data from map to object if needed
            const additionalDataObj = {};
            if (additional_data) {
                Object.entries(additional_data).forEach(([key, value]) => {
                    additionalDataObj[key] = value;
                });
            }

            // Call the existing emitVideoStatus function
            await emitVideoStatus(video_id, status, additionalDataObj);

            callback(null, {
                success: true,
                message: `Successfully emitted status update for video ${video_id}`
            });
        } catch (error) {
            callback({
                code: grpc.status.INTERNAL,
                details: `Failed to emit video status: ${error.message}`
            });
        }
    }
}

function startGrpcServer(serverAddress = '0.0.0.0:50051') {
    const server = new grpc.Server();
    server.addService(videoservice.VideoStatusService.service, new VideoStatusService());

    server.bindAsync(serverAddress, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
            console.error('Failed to start gRPC server:', error);
            return;
        }
        // server.start();
        console.log(`gRPC server running at ${serverAddress}`);
    });

    return server;
}

module.exports = { startGrpcServer };
const oci = require('oci-sdk');
require('dotenv').config();

const queueEndpoint = process.env.QUEUE_ENDPOINT;

const provider = new oci.common.ConfigFileAuthenticationDetailsProvider();

const queueClient = new oci.queue.QueueClient({
    authenticationDetailsProvider: provider
});
queueClient.endpoint = queueEndpoint;

module.exports = queueClient;   
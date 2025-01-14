const oci = require('oci-sdk');

const provider = new oci.common.ConfigFileAuthenticationDetailsProvider();
const objectStorageClient = new oci.objectstorage.ObjectStorageClient({
    authenticationDetailsProvider: provider
});

module.exports = objectStorageClient;
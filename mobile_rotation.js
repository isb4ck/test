// Mocked Mobile Data Rotation Module for Testing
async function rotateMobileData() {
    console.log('✈️ [TEST] Skipping airplane mode toggle.');
    return Promise.resolve();
}

async function getCurrentMobileIP() {
    console.log('🌐 [TEST] Returning mock IP address.');
    return Promise.resolve('192.168.1.100');
}

module.exports = { rotateMobileData, getCurrentMobileIP };

const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    const AI_SERVICE_URL = process.env.VITE_AI_SERVICE_URL || 'https://ai-sparefinder-com.onrender.com';

    try {
        console.log('Pinging AI service for keep-alive...');

        const response = await fetch(`${AI_SERVICE_URL}/health`, {
            method: 'GET',
            timeout: 10000,
            headers: {
                'User-Agent': 'SpareFinder-KeepAlive/1.0',
                'Cache-Control': 'no-cache'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('AI service keep-alive successful:', data.status);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    success: true,
                    message: 'AI service pinged successfully',
                    status: data.status,
                    timestamp: new Date().toISOString()
                })
            };
        } else {
            console.warn('AI service keep-alive failed:', response.status);
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    success: false,
                    message: 'AI service ping failed',
                    status: response.status
                })
            };
        }
    } catch (error) {
        console.error('Keep-alive error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                message: 'Keep-alive request failed',
                error: error.message
            })
        };
    }
};
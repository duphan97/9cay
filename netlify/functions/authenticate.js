// netlify/functions/authenticate.js
const { HISTORY_PASSWORD } = process.env;

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { password } = JSON.parse(event.body);

        if (!password || password !== HISTORY_PASSWORD) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'Mật khẩu không đúng.' }),
            };
        }

        // Tạo một token đơn giản (thời gian hết hạn ngắn)
        const expiry = Date.now() + 3600000; // 1 giờ
        const token = Buffer.from(`${password}:${expiry}`).toString('base64');

        return {
            statusCode: 200,
            body: JSON.stringify({ token, expiry }),
        };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: 'Lỗi server.' }) };
    }
};

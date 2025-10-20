// netlify/functions/get-history.js
const fetch = require('node-fetch');
const { HISTORY_PASSWORD } = process.env;

// Cấu hình GitHub (Cần giống trong history.html)
const GITHUB_USERNAME = "duphan97"; 
const REPO_NAME = "9cay"; 
const HISTORY_FILE_PATH = "sessions/game_sessions.json";
const PUBLIC_HISTORY_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/${REPO_NAME}/main/${HISTORY_FILE_PATH}`;

// Hàm kiểm tra token
const isValidToken = (token) => {
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const [password, expiryStr] = decoded.split(':');
        const expiry = parseInt(expiryStr, 10);
        
        if (password !== HISTORY_PASSWORD) return false;
        if (Date.now() > expiry) return false;

        return true;
    } catch (e) {
        return false;
    }
};

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const token = event.headers['x-auth-token'];

    if (!token || !isValidToken(token)) {
        return {
            statusCode: 401,
            body: JSON.stringify({ message: 'Không có quyền truy cập hoặc token hết hạn. Vui lòng đăng nhập lại.' }),
        };
    }
    
    try {
        // Tải dữ liệu lịch sử từ GitHub
        const response = await fetch(PUBLIC_HISTORY_URL);
        
        if (!response.ok) {
             const errorBody = await response.text();
             return {
                statusCode: response.status,
                body: JSON.stringify({ 
                    message: `Lỗi khi tải lịch sử từ GitHub: ${response.status}`,
                    details: errorBody.substring(0, 100)
                }),
            };
        }
        
        const data = await response.json();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: `Lỗi server khi tải dữ liệu: ${error.message}` }) };
    }
};

// netlify/functions/save-session.js
const { Octokit } = require("@octokit/core");

exports.handler = async (event, context) => {
  // 1. Kiểm tra phương thức HTTP
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed. Use POST." }),
    };
  }

  // Lấy PAT từ biến môi trường
  const GITHUB_PAT = process.env.GITHUB_PAT;
  if (!GITHUB_PAT) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server configuration error: GITHUB_PAT not set." }),
    };
  }

  // Cấu hình REPO và PATH
  // 💥 THAY THẾ 'YOUR_GITHUB_USERNAME' BẰNG USERNAME CỦA BẠN
  const owner = "duphan97"; 
  // 💥 THAY THẾ 'YOUR_REPO_NAME' BẰNG TÊN REPO CHỨA CODE CỦA BẠN
  const repo = "9cay"; 
  
  const filePath = "sessions/game_sessions.json"; // File JSON tổng sẽ được lưu/cập nhật tại đây
  const branch = "main"; // Đổi thành "gh-pages" nếu bạn host bằng nhánh đó

  // 2. Phân tích dữ liệu JSON từ client gửi lên
  let sessionData;
  try {
    sessionData = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid JSON body." }),
    };
  }
  
  // Thêm dấu thời gian server-side để đảm bảo tính duy nhất
  sessionData.serverTimestamp = new Date().toISOString();

  const octokit = new Octokit({ auth: GITHUB_PAT });

  try {
    // --- BƯỚC A: LẤY NỘI DUNG TỆP HIỆN TẠI (GET) ---
    let existingContent = [];
    let sha = null;
    try {
      const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner,
        repo,
        path: filePath,
        ref: branch
      });
      
      // Nếu tệp tồn tại, lấy SHA và nội dung
      if (response.status === 200) {
        sha = response.data.sha;
        // Nội dung trả về là base64, cần giải mã
        const contentBase64 = response.data.content;
        const contentDecoded = Buffer.from(contentBase64, 'base64').toString('utf8');
        existingContent = JSON.parse(contentDecoded);
      }
    } catch (e) {
      // Bỏ qua lỗi 404 (Not Found) nếu tệp chưa tồn tại
      if (e.status !== 404) {
          throw e; // Ném lỗi khác 404
      }
    }

    // --- BƯỚC B: CẬP NHẬT NỘI DUNG MỚI ---
    if (!Array.isArray(existingContent)) {
        // Đảm bảo nội dung là một mảng nếu file bị lỗi format
        existingContent = []; 
    }
    existingContent.push(sessionData);
    const newContentBase64 = Buffer.from(JSON.stringify(existingContent, null, 2)).toString('base64');
    
    // --- BƯỚC C: GHI LẠI TỆP LÊN GITHUB (PUT) ---
    const commitMessage = `Auto-save: Game Session ${sessionData.sessionId} completed.`;
    
    const updateResponse = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path: filePath,
      message: commitMessage,
      content: newContentBase64,
      sha: sha, // Cần SHA để update. Nếu SHA là null, GitHub sẽ tạo tệp mới.
      branch: branch
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Session saved successfully!", commit: updateResponse.data.commit.sha }),
    };

  } catch (error) {
    return {
      statusCode: error.status || 500,
      body: JSON.stringify({ message: "Failed to save session to GitHub. Check Netlify logs for details." }),
    };
  }
};
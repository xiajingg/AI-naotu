const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// 配置 CORS
app.use(cors({
    origin: '*',  // 允许所有源访问
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

// 解析 JSON 请求体
app.use(express.json());

// 获取模型列表
app.get('/api/models', async (req, res) => {
    try {
        const response = await axios.get('http://127.0.0.1:11434/api/tags');
        res.json(response.data);
    } catch (error) {
        console.error('获取模型列表失败:', error.message);
        console.error('错误详情:', error.response ? error.response.data : '无响应数据');
        res.status(500).json({
            error: '获取模型列表失败',
            message: error.message,
            details: error.response ? error.response.data : null
        });
    }
});

// 生成回复
app.post('/api/chat', async (req, res) => {
    try {
        // 设置 SSE 头部
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 创建到 Ollama 的请求
        const response = await axios.post('http://127.0.0.1:11434/api/generate', req.body, {
            responseType: 'stream'
        });

        let fullResponse = '';

        // 处理流式响应
        response.data.on('data', chunk => {
            try {
                const lines = chunk.toString().split('\n').filter(Boolean);
                lines.forEach(line => {
                    const data = JSON.parse(line);
                    if (data.response) {
                        fullResponse += data.response;
                        // 发送 SSE 事件
                        res.write(`data: ${JSON.stringify({ response: data.response })}\n\n`);
                    }
                });
            } catch (e) {
                console.error('解析响应数据失败:', e);
            }
        });

        response.data.on('end', () => {
            res.write(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`);
            res.end();
        });

        response.data.on('error', error => {
            console.error('流处理错误:', error);
            res.write(`data: ${JSON.stringify({ error: '生成回复失败' })}\n\n`);
            res.end();
        });

    } catch (error) {
        console.error('生成回复失败:', error.message);
        console.error('错误详情:', error.response ? error.response.data : '无响应数据');
        res.write(`data: ${JSON.stringify({
            error: '生成回复失败',
            message: error.message,
            details: error.response ? error.response.data : null
        })}\n\n`);
        res.end();
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});
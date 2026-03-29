#!/bin/bash

echo "启动前端开发环境..."

# 切换到前端目录
cd frontend

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

# 启动开发服务器
echo "启动前端开发服务器..."
echo "前端将在 http://localhost:3000 运行"
echo "按 Ctrl+C 停止"

npm run dev
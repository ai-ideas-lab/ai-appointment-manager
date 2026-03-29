#!/bin/bash

echo "测试前端集成..."

# 检查前端目录是否存在
if [ ! -d "frontend" ]; then
    echo "错误: 前端目录不存在"
    exit 1
fi

# 检查前端依赖是否安装
if [ ! -d "frontend/node_modules" ]; then
    echo "前端依赖未安装，正在安装..."
    cd frontend
    npm install
    cd ..
fi

# 检查关键文件
echo "检查关键文件..."
files=(
    "frontend/src/App.tsx"
    "frontend/src/main.tsx"
    "frontend/src/pages/Dashboard.tsx"
    "frontend/src/pages/Login.tsx"
    "frontend/src/pages/Appointments.tsx"
    "frontend/src/components/Layout.tsx"
    "frontend/src/contexts/AuthContext.tsx"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file"
    else
        echo "✗ $file 缺失"
    fi
done

echo ""
echo "前端集成测试完成"
echo "下一步："
echo "1. 启动后端: npm run dev"
echo "2. 启动前端: npm run dev-frontend"
echo "3. 访问: http://localhost:3000"
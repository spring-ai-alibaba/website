#!/bin/bash

echo "=== 开始构建测试 ==="
echo "清理旧文件..."
rm -rf build .docusaurus

echo "开始构建..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 构建成功!"
    echo "检查重定向文件..."
    ls -la build/zh-Hans/docs/1.0.0.2/ 2>/dev/null || echo "❌ 重定向目录不存在"

    if [ -f "build/zh-Hans/docs/1.0.0.2/index.html" ]; then
        echo "✅ 找到重定向文件"
        echo "重定向文件内容预览:"
        head -20 build/zh-Hans/docs/1.0.0.2/index.html
    fi
else
    echo "❌ 构建失败"
    exit 1
fi


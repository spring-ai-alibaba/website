#!/bin/bash

# 构建后脚本：将 static/_redirects 文件复制到 build 目录

echo "正在复制 _redirects 文件到 build 目录..."

if [ -f "static/_redirects" ]; then
    cp static/_redirects build/_redirects
    echo "✅ _redirects 文件已复制到 build/_redirects"
else
    echo "⚠️  static/_redirects 文件不存在"
    exit 1
fi

echo "构建后处理完成"


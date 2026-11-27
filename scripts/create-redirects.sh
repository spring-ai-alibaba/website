#!/bin/bash

# 脚本说明：为旧版本路径创建重定向 HTML 文件 + 404 页面
# 用途：
#   1. 将旧版文档路径重定向到对应版本线的文档首页
#   2. 创建智能 404 页面，捕获所有找不到的旧路径
# 使用：npm run build && ./scripts/create-redirects.sh

set -e  # 遇到错误立即退出

echo "========================================"
echo "开始创建重定向文件..."
echo "========================================"

# 旧版本列表
VERSIONS=("1.0.0.2" "1.0.0-M6.1" "1.0.0-M5.1" "1.0.0-M3.2")

# 重定向目标页面
TARGET_PATH="/docs/overview"

# 确保 build 目录存在
if [ ! -d "build" ]; then
  echo "❌ 错误：build 目录不存在，请先运行 npm run build"
  exit 1
fi

# 第一步：为每个版本创建根路径重定向
#echo "📝 步骤 1：创建根路径重定向..."
#for version in "${VERSIONS[@]}"; do
#  version_dir="build/docs/$version"
#  mkdir -p "$version_dir"
#
#  cat > "$version_dir/index.html" << 'ROOTEOF'
#<!DOCTYPE html>
#<html lang="zh-Hans">
#  <head>
#    <meta charset="UTF-8">
#    <meta http-equiv="refresh" content="0; url=/docs/overview">
#    <link rel="canonical" href="/docs/overview" />
#    <meta name="robots" content="noindex">
#    <title>页面已迁移</title>
#    <style>
#      body {
#        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
#        display: flex;
#        align-items: center;
#        justify-content: center;
#        height: 100vh;
#        margin: 0;
#        background-color: #f5f5f5;
#      }
#      .container {
#        text-align: center;
#        padding: 2rem;
#        background: white;
#        border-radius: 8px;
#        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
#      }
#      a { color: #1890ff; text-decoration: none; }
#      a:hover { text-decoration: underline; }
#    </style>
#  </head>
#  <body>
#    <div class="container">
#      <h1>页面已迁移</h1>
#      <p>此页面已迁移到新地址</p>
#      <p>正在自动跳转...</p>
#      <p>如果没有自动跳转，请<a href="/docs/overview">点击这里</a></p>
#    </div>
#    <script>
#      window.location.href = '/docs/overview' + window.location.search + window.location.hash;
#    </script>
#  </body>
#</html>
#ROOTEOF
#
#  echo "  ✓ /docs/$version → /docs/overview"
#done

# 第二步：创建智能 404 页面
echo ""
echo "📝 步骤 2：创建智能 404 页面..."
cat > "build/404.html" << 'EOF404'
<!DOCTYPE html>
<html lang="zh-Hans">
  <head>
    <meta charset="UTF-8">
    <title>页面已迁移</title>
    <meta name="robots" content="noindex">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        background-color: #f5f5f5;
      }
      .container {
        text-align: center;
        padding: 2rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        max-width: 600px;
      }
      h1 { color: #1890ff; margin-bottom: 1rem; }
      p { color: #666; line-height: 1.6; }
      a { color: #1890ff; text-decoration: none; font-weight: 500; }
      a:hover { text-decoration: underline; }
      .spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid rgba(24, 144, 255, 0.3);
        border-radius: 50%;
        border-top-color: #1890ff;
        animation: spin 1s ease-in-out infinite;
        margin-right: 8px;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>页面已迁移</h1>
      <p id="message">
        <span class="spinner"></span>
        正在自动跳转到新版文档...
      </p>
      <p>如果没有自动跳转，请<a href="/docs/overview" id="manualLink">点击这里</a></p>
    </div>
    <script>
      (function() {
        var currentPath = window.location.pathname;
        var locale = currentPath.startsWith('/en/') ? '/en' : '';
        var route = currentPath.slice(locale.length);
        var targetPath = locale + '/docs/overview';

        var archivedVersion = route.match(/^\/(?:docs|agents|integration|ecosystem)\/(1\.x|2\.0\.x)(?:\/|$)/);
        var oldVersion = route.match(/^\/docs\/1\.0\.0(?:\.2|-M(?:[56]\.1|3\.2))(?:\/|$)/);
        var isOldVersion = archivedVersion || oldVersion;
        if (isOldVersion) {
          var version = archivedVersion ? archivedVersion[1] : '1.x';
          targetPath = locale + '/docs/' + version + '/overview';
        }

        if (isOldVersion) {
          document.getElementById('message').innerHTML =
            '<span class="spinner"></span>正在跳转到该版本的文档首页...';
        } else {
          document.getElementById('message').innerHTML =
            '<span class="spinner"></span>页面不存在，正在跳转到文档首页...';
        }

        setTimeout(function() {
          window.location.href = targetPath + window.location.search + window.location.hash;
        }, 1000);

        document.getElementById('manualLink').href = targetPath;
      })();
    </script>
  </body>
</html>
EOF404

echo "  ✓ build/404.html 已创建"

# 统计信息
redirect_count=$(find build/docs -name "index.html" -path "*/1.0.0*/index.html" 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "======================================"
echo "✅ 重定向配置创建完成！"
echo "======================================"
echo "📊 统计："
echo "  - 根路径重定向：${#VERSIONS[@]} 个"
echo "  - 插件生成的子路径重定向：$redirect_count 个"
echo "  - 404 页面：已创建"
echo ""
echo "💡 工作原理："
echo "  1. 旧版本根路径（如 /docs/1.0.0.2）→ 直接重定向"
echo "  2. 新文档中存在的路径（如 /docs/1.0.0.2/overview）→ 插件自动生成重定向"
echo "  3. 新文档中不存在的路径（如 /docs/1.0.0.2/xxx）→ 通过 404 页面捕获并重定向"
echo ""
echo "🔧 OSS 配置（重要！）："
echo "  请在阿里云 OSS 控制台配置："
echo "  1. 进入 Bucket 设置 → 基础设置 → 静态页面"
echo "  2. 默认首页：index.html"
echo "  3. 默认 404 页：404.html"
echo ""
echo "🧪 测试方法："
echo "  1. npm run serve"
echo "  2. 访问 http://localhost:3000/docs/1.0.0.2"
echo "     → 应跳转到 /docs/1.x/overview"
echo "  3. 访问 http://localhost:3000/docs/1.0.0.2/get-started/workflow"
echo "     → 应跳转到 /docs/1.x/overview（通过404页面）"
echo ""

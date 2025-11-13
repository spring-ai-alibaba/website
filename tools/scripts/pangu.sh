#!/bin/bash

# 盘古之白 - 自动在中文和英文/数字之间添加空格
# 使用方法: ./pangu.sh <file_path>
# 示例: ./pangu.sh docs/overview.md

set -e

if [ $# -eq 0 ]; then
    echo "错误: 请提供文件路径"
    echo "使用方法: $0 <file_path>"
    echo "示例: $0 docs/overview.md"
    exit 1
fi

FILE="$1"

if [ ! -f "$FILE" ]; then
    echo "错误: 文件不存在: $FILE"
    exit 1
fi

echo "正在处理文件: $FILE"

# 创建临时文件
TEMP_FILE=$(mktemp)

# 使用 sed 进行替换
# 注意: macOS 的 sed 需要 -i '' 参数，Linux 需要 -i
sed_backup=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed_backup=".bak"
fi

# 处理文件
cat "$FILE" > "$TEMP_FILE"

# 1. 中文后面跟英文字母 - 添加空格
sed -i $sed_backup 's/\([一-龥]\)\([a-zA-Z]\)/\1 \2/g' "$TEMP_FILE"

# 2. 英文字母后面跟中文 - 添加空格
sed -i $sed_backup 's/\([a-zA-Z]\)\([一-龥]\)/\1 \2/g' "$TEMP_FILE"

# 3. 中文后面跟数字 - 添加空格
sed -i $sed_backup 's/\([一-龥]\)\([0-9]\)/\1 \2/g' "$TEMP_FILE"

# 4. 数字后面跟中文 - 添加空格
sed -i $sed_backup 's/\([0-9]\)\([一-龥]\)/\1 \2/g' "$TEMP_FILE"

# 5. 中文后面跟左括号 - 添加空格
sed -i $sed_backup 's/\([一-龥]\)(\([a-zA-Z0-9]\)/\1 (\2/g' "$TEMP_FILE"

# 6. 右括号后面跟中文 - 添加空格
sed -i $sed_backup 's/\([a-zA-Z0-9]\))\([一-龥]\)/\1) \2/g' "$TEMP_FILE"

# 清理可能产生的多余空格（避免重复添加）
sed -i $sed_backup 's/  \+/ /g' "$TEMP_FILE"

# 删除 sed 的备份文件（如果存在）
rm -f "${TEMP_FILE}${sed_backup}"

# 将处理后的内容写回原文件
mv "$TEMP_FILE" "$FILE"

echo "✓ 处理完成: $FILE"

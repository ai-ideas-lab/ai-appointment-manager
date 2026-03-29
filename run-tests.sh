#!/bin/bash

# AI Appointment Manager - 测试运行脚本
# 用于运行所有测试并生成报告

set -e

echo "🧪 开始运行 AI Appointment Manager 测试套件..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数：打印带颜色的信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
print_info "检查测试依赖..."

if ! command -v npm &> /dev/null; then
    print_error "npm 未安装"
    exit 1
fi

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    print_info "安装项目依赖..."
    npm install
fi

# 创建测试数据库
print_info "设置测试环境..."
npm run db:generate > /dev/null 2>&1 || print_warning "数据库生成失败，继续测试..."

# 运行所有测试
print_info "运行测试套件..."

# 创建测试报告目录
mkdir -p test-reports

# 运行单元测试
print_info "运行单元测试..."
if npm test -- --verbose --coverage --testResultsProcessor=jest-junit --testResultsDirectory=test-reports/junit; then
    print_success "单元测试通过 ✅"
    TEST_SUCCESS=true
else
    print_error "单元测试失败 ❌"
    TEST_SUCCESS=false
fi

# 运行代码覆盖率报告
print_info "生成代码覆盖率报告..."
npm run test -- --coverage --coverageReporters=text coverage/lcov-report

# 运行类型检查
print_info "运行类型检查..."
if npm run type-check; then
    print_success "类型检查通过 ✅"
else
    print_warning "类型检查失败 ❌"
fi

# 运行代码检查
print_info "运行代码质量检查..."
if npm run lint; then
    print_success "代码检查通过 ✅"
else
    print_warning "代码检查失败 ❌"
fi

# 生成测试摘要
print_info "生成测试摘要..."

SUMMARY_FILE=test-reports/summary.md
cat > $SUMMARY_FILE << EOF
# AI Appointment Manager 测试报告

## 测试概览

*测试执行时间：$(date)*

## 测试结果

$(if [ "$TEST_SUCCESS" = true ]; then echo "✅ 所有测试通过"; else echo "❌ 部分测试失败"; fi)

## 覆盖率统计

EOF

# 添加覆盖率摘要（如果存在）
if [ -f "coverage/coverage-summary.json" ]; then
    jq -r '
    .total | "
### 总体覆盖率
- 行覆盖率: \(.lines.pct)%
- 函数覆盖率: \(.functions.pct)%
- 分支覆盖率: \(.branches.pct)%
- 语句覆盖率: \(.statements.pct)%"
    ' coverage/coverage-summary.json >> $SUMMARY_FILE
else
    echo "### 未找到覆盖率数据" >> $SUMMARY_FILE
fi

echo "" >> $SUMMARY_FILE

echo "## 测试文件" >> $SUMMARY_FILE
find tests -name "*.test.*" -type f | while read test_file; do
    echo "- $test_file" >> $SUMMARY_FILE
done

echo "" >> $SUMMARY_FILE
echo "## 测试命令" >> $SUMMARY_FILE
echo "
\`\`\`
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 运行特定测试文件
npm test -- tests/services/appointmentAI.test.ts

# 运行测试并生成XML报告
npm test -- --testResultsProcessor=jest-junit
\`\`\`
" >> $SUMMARY_FILE

# 显示摘要
print_info "测试摘要已生成：$SUMMARY_FILE"
cat $SUMMARY_FILE

# 输出最终结果
echo ""
echo "=============================================="
if [ "$TEST_SUCCESS" = true ]; then
    print_success "🎉 测试套件执行完成！"
    print_success "所有测试通过，系统就绪！"
else
    print_error "⚠️ 测试套件执行完成，但有失败项！"
    print_error "请查看上述错误信息并修复问题。"
fi

echo "=============================================="

# 检查测试结果并决定退出码
if [ "$TEST_SUCCESS" = true ]; then
    exit 0
else
    exit 1
fi
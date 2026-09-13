#!/bin/sh
# ============================================================
# 剥离脱敏占位行
#
# 背景：这个整合版仓库（DKwms/pguide）为了不泄露作者线上环境，把所有连接信息
# 替换成了 `**`。问题在于这不只是"值不对"，而是**语法就错了**：
#
#   `*` 在 YAML 里是别名（alias）符号，`password: **` 会被 SnakeYAML 当成
#   "引用一个名字叫 * 的锚点"，直接抛：
#       org.yaml.snakeyaml.scanner.ScannerException: while scanning an alias
#
# 结果就是应用连配置都读不出来 —— 环境变量覆盖（SPRING_DATASOURCE_URL 等）
# 根本轮不到生效，因为解析在第一行就崩了。
#
# 处理办法：把"值恰好是一个或多个 *"的整行删掉。属性不再出现在 yml 里，
# 就完全由 compose 里的环境变量提供。
#
# 只删值**恰好是** `*+` 的行，所以不会误伤这些合法的星号：
#   - Path=/api/auth/**            （Spring Cloud Gateway 的路径通配）
#   - com.ruoyi.**.domain          （MyBatis 的包名通配）
#   - classpath*:mapper/**/*Mapper.xml
#   - jdbc:mysql://**:3306/xxx     （** 在值中间，本就是合法 YAML，只是 host 是假的）
# ============================================================
set -eu

BASE="${1:-.}"

echo "[normalize-config] 扫描 ${BASE} 下的 yml，剔除脱敏占位行"

find "$BASE" \( -name '*.yml' -o -name '*.yaml' \) -type f | sort | while IFS= read -r f; do
    removed=$(grep -c -E '^[[:space:]]*[A-Za-z0-9_.-]+:[[:space:]]*\*+[[:space:]]*$' "$f" || true)
    if [ "$removed" -gt 0 ]; then
        sed -i -E '/^[[:space:]]*[A-Za-z0-9_.-]+:[[:space:]]*\*+[[:space:]]*$/d' "$f"
        printf '  %-72s 删除 %s 行\n' "${f#"$BASE"/}" "$removed"
    fi
done

echo "[normalize-config] 完成"

# ============================================================
# RuoYi 管理后台镜像（PGuide-Manage/PGuide-Manage）
#
# 这是独立的 Maven 聚合工程（RuoYi-Vue 3.8.6 二次开发），
# 与 PGuide-Back 无关，所以单独一个 Dockerfile。
# ============================================================

# ---------------- 1. 构建阶段 ----------------
FROM maven:3.8.6-openjdk-8 AS builder

WORKDIR /build

COPY PGuide-Manage/PGuide-Manage/ /build/

# 阿里云镜像加速（和 backend.Dockerfile 同一份文件）
COPY docker/maven-settings.xml /root/.m2/settings.xml

# 修掉脱敏占位：`**` 会让 SnakeYAML 报 "while scanning an alias"
COPY docker/normalize-config.sh /usr/local/bin/normalize-config.sh
RUN sh /usr/local/bin/normalize-config.sh /build

# ruoyi-admin 的 pom 自己声明了 spring-boot-maven-plugin + repackage，
# 所以 package 直接产出可执行 jar（finalName = ruoyi-admin）
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn -B -ntp -DskipTests clean package

# ---------------- 2. 运行阶段 ----------------
FROM maven:3.8.6-openjdk-8 AS runtime

WORKDIR /app

COPY --from=builder /build/ruoyi-admin/target/*.jar /app/app.jar

# 源码里 ruoyi.profile 是 Windows 路径 D:/ruoyi/uploadPath，
# compose 会用 RUOYI_PROFILE=/home/ruoyi/uploadPath 覆盖，这里先把目录建好
RUN mkdir -p /home/ruoyi/uploadPath

ENV TZ=Asia/Shanghai

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar $APP_ARGS"]

# ============================================================
# PGuide-Back 微服务通用镜像
#
# 一个 builder 阶段编译全部模块，各服务镜像只从中 COPY 自己的 jar。
# BuildKit 会缓存 builder 阶段，所以 7 个服务不会重复编译 7 遍。
#
# 构建参数：
#   SERVICE_MODULE  模块相对路径，如 pguide-auth
#   SERVICE_PORT    仅用于 EXPOSE 声明，不影响实际监听端口
# ============================================================

# ---------------- 1. 构建阶段 ----------------
FROM maven:3.8.6-openjdk-8 AS builder

WORKDIR /build

# .dockerignore 已排除 node_modules / target / 前端，这里只有后端 Java 源码
COPY PGuide-Back/ /build/

# 配阿里云镜像加速依赖下载。项目 pom 里没有任何 repository / mirror 声明，
# 直连 Maven Central 在国内实测 20 分钟只拉 80MB，这个工程首次构建要 300MB+。
# 放在 cache mount 之外，避免被 /root/.m2/repository 的挂载遮住。
COPY docker/maven-settings.xml /root/.m2/settings.xml

# 修掉脱敏占位：`**` 会让 SnakeYAML 报 "while scanning an alias"，
# 必须在编译前处理（资源是被打进 jar 的）。详见该脚本头部注释。
COPY docker/normalize-config.sh /usr/local/bin/normalize-config.sh
RUN sh /usr/local/bin/normalize-config.sh /build

# pguide-commons / pguide-api / pguide-entity 是其它模块的依赖，
# 必须先 install 进本地仓库，后续模块才解析得到。
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn -B -ntp -DskipTests clean install

# pguide-project-match-provider 和 pguide-index-info-provider 的 pom 没有声明
# spring-boot-maven-plugin（其它模块靠根 pom 的 pluginManagement 继承来获得
# repackage 绑定），因此 mvn install 产出的是普通 jar。
# 这里显式补跑一次 repackage 生成可执行 fat jar —— 不改源码，只在构建期打补丁。
#
# 必须把 package 生命周期和 repackage 目标写在同一次调用里：
# repackage 读的是 project.getArtifact().getFile()，只单独调 goal（不带 package）
# 时该文件为 null，会报 "Source file must not be null"。
RUN --mount=type=cache,target=/root/.m2/repository \
    mvn -B -ntp -DskipTests \
        -pl pguide-business-providers/pguide-project-match-provider,pguide-business-providers/pguide-index-info-provider \
        package org.springframework.boot:spring-boot-maven-plugin:2.6.6:repackage

# ---------------- 2. 运行阶段 ----------------
# 刻意复用 maven 镜像作运行时基座：本机已经有这个镜像，不必再访问 Docker Hub
# （国内拉 Docker Hub 经常被阻断）。代价是镜像偏大，但 8 个服务共享同一层，
# 实际磁盘占用只有一份。想换精简 JRE 就把下面这行改成 eclipse-temurin:8-jre。
FROM maven:3.8.6-openjdk-8 AS runtime

ARG SERVICE_MODULE
ARG SERVICE_PORT=8080

WORKDIR /app

# target 下同时存在 X.jar 和 X.jar.original，
# 通配符 *.jar 只会匹配到前者（.original 结尾的不是 .jar）
COPY --from=builder /build/${SERVICE_MODULE}/target/*.jar /app/app.jar

ENV TZ=Asia/Shanghai

EXPOSE ${SERVICE_PORT}

# APP_ARGS 是逃生口：需要临时覆盖任何配置时（比如 search-provider 的
# spring.application.name），在 compose 里传命令行参数，优先级高于所有 yml。
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar $APP_ARGS"]

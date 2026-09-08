FROM eclipse-temurin:21-jdk-jammy AS java
FROM node:24-bookworm-slim

COPY --from=java /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="/opt/java/openjdk/bin:${PATH}"
ENV CI=true NX_NO_CLOUD=true NX_DAEMON=false HUSKY=0
ENV NX_PLUGIN_NO_TIMEOUTS=true
ENV NX_AUTOMATION_IDE_HEAP=1g
ENV CYPRESS_INSTALL_BINARY=0 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    git procps xvfb ffmpeg fonts-dejavu-core libasound2 libnss3 libxkbfile1 \
    libx11-6 libxi6 libxtst6 libxrender1 libxrandr2 libglib2.0-0 libdbus-1-3 libgbm1 \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && mkdir /workspace && chown node:node /workspace

USER node
WORKDIR /workspace
RUN mkdir -p /home/node/.gradle && printf '%s\n' \
    'org.gradle.jvmargs=-Xmx512m -XX:ActiveProcessorCount=4' \
    'kotlin.daemon.jvmargs=-Xmx1g' 'org.gradle.workers.max=2' \
    'org.gradle.priority=low' 'org.gradle.daemon.idletimeout=10000' \
    > /home/node/.gradle/gradle.properties

COPY --chown=node:node . .
RUN mkdir -p .yarn
RUN --mount=type=cache,target=/workspace/.yarn/cache,uid=1000,gid=1000 yarn install --immutable
RUN git init && git add . && git -c user.name=E2E -c user.email=e2e@example.test commit -qm fixture

CMD ["yarn", "nx", "run", "intellij:e2e"]

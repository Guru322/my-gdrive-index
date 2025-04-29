FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY rclone.conf ./

COPY server/ ./server/
COPY public/ ./public/
COPY src/ ./src/
COPY requirements.txt ./

RUN apk add --no-cache python3 py3-pip
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"
RUN pip3 install --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt

RUN apk add --no-cache curl unzip && \
    curl -O https://downloads.rclone.org/rclone-current-linux-amd64.zip && \
    unzip rclone-current-linux-amd64.zip && \
    cd rclone-*-linux-amd64 && \
    cp rclone /usr/bin/ && \
    chmod 755 /usr/bin/rclone && \
    cd .. && \
    rm -rf rclone-*

RUN npm run build

EXPOSE 3005

CMD ["npm", "run", "prod"]
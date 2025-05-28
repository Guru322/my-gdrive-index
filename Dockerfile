FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY rclone.conf ./

COPY server/ ./server/
COPY public/ ./public/
COPY src/ ./src/
COPY requirements.txt ./

RUN apk update && \
    apk add --no-cache python3 py3-pip ca-certificates curl bash unzip

RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"
RUN pip3 install --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt

RUN echo "Attempting to install the latest stable rclone version" && \
    curl -fL https://rclone.org/install.sh -o /tmp/install_rclone.sh && \
    echo "Install script downloaded. Setting execute permissions." && \
    chmod +x /tmp/install_rclone.sh && \
    echo "Executing rclone install script with UNZIP_OPTS=-oq explicitly set..." && \
    UNZIP_OPTS="-oq" bash /tmp/install_rclone.sh && \
    echo "Install script finished. Verifying rclone installation..." && \
    rclone --version && \
    echo "Rclone installed and verified." && \
    rm -f /tmp/install_rclone.sh

RUN npm run build

EXPOSE 3003

CMD ["npm", "run", "prod"]

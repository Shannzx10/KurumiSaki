FROM node:20-bullseye

RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    imagemagick \
    webp \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json .

RUN npm install && npm install dotenv

COPY . .

RUN chown -R 1000:1000 /app

USER 1000

# Expose port yang dibutuhkan HF
EXPOSE 7860

CMD ["npm", "run", "stable"]
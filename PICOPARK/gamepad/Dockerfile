FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV EXPO_NO_TELEMETRY=1
EXPOSE 8081
CMD ["npx", "expo", "start", "--lan"]

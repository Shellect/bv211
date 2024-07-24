FROM node:16-alpine
WORKDIR /application
COPY package*.json .
RUN npm install
CMD ["npm", "start"]
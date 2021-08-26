FROM node:14

ENV POSTGRES_HOST=localhost
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=pgpass
ENV POSTGRES_DB=postgres
ENV POSTGRES_PORT=5432
EXPOSE 80

WORKDIR /app
ADD package.json package-lock.json /app/
RUN npm ci
RUN npm run build

CMD npm run start
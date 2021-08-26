FROM postgres:13-buster

ADD initdb/ /docker-entrypoint-initdb.d/

ENV POSTGRES_PASSWORD=pgpass
EXPOSE 5432

RUN apt-get update
RUN apt-get -y install

RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs

CMD ["postgres"]
FROM postgres:13-buster

ADD initdb /docker-entrypoint-initdb.d/

ENV POSTGRES_PASSWORD=pgpass
EXPOSE 5432


CMD ["postgres"]
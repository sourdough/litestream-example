# see https://github.com/denoland/deno_docker/blob/main/example/Dockerfile
FROM denoland/deno:1.37.1
# see https://litestream.io/guides/gcs/ running from google cloud doesn't require a key
#ENV GOOGLE_APPLICATION_CREDENTIALS=/path/to/secret-litestream-gcloud-key.json

# see https://github.com/steren/litestream-cloud-run-example
# note that Livestream expects gcs:// instead of gs://, this will change in the next Litestream release
ENV LSSQLITE_REPLICA_URL=gcs://jimmont-sqlite-litestream/data/data.db
ENV SQLITE_PATH=/tmp/data.db

# fix error "failed to verify certificate: x509: certificate signed by unknown authority"
# ca-certificates package includes update-ca-certificates command
RUN apt-get update
RUN apt-get install -y ca-certificates
RUN update-ca-certificates --fresh

# see https://github.com/benbjohnson/litestream/releases/
ADD https://github.com/benbjohnson/litestream/releases/download/v0.3.11/litestream-v0.3.11-linux-amd64.tar.gz /tmp/litestream.tar.gz
RUN tar -C /usr/local/bin -xzf /tmp/litestream.tar.gz

# cache dependencies as a layer
COPY . .
RUN deno cache deps.js
RUN deno cache startup.js
RUN deno cache http.js

# default 8080 cloud-run https://cloud.google.com/run/docs/reference/container-contract
EXPOSE 8080

# sqlite foreign function interface (ffi) requires unstable or fails with 
# error: Uncaught (in promise) Error: Failed to load SQLite3 Dynamic Library
#  throw new Error("Failed to load SQLite3 Dynamic Library", { cause: e });
CMD ["run", "-A", "--unstable", "startup.js"]

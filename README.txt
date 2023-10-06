
Deno on Google Cloud Run using 
SQLite replication to Google Cloud Bucket
with Litestream

setup:
- install Deno 🦕 https://deno.com/ https://docs.deno.com/runtime/manual/getting_started/installation
- install LiteStream https://litestream.io/ https://litestream.io/install/

- create a bucket in a single region (I used us-west1 Oregon due to price and green energy preference)
- upload SQLite database to it, use this URL for variable LSSQLITE_REPLICA_URL
- edit the Docker file to use the correct variable values there for the path and bucket
- setup a Cloud Run instance in the same single region, I used the commands below to submit and deploy
  note the single instance and public service, replacing PROJECT, BUCKET, VERSIONING and REGION

commands:
gcloud builds submit --tag gcr.io/PROJECT/BUCKET:VERSIONING
gcloud beta run deploy BUCKET --image gcr.io/PROJECT/BUCKET:VERSIONING --max-instances 1 --execution-environment gen2 --no-cpu-throttling --allow-unauthenticated --region REGION --project PROJECT

example:
gcloud builds submit --tag gcr.io/my-project/my-bucket:20231005.1
gcloud beta run deploy my-bucket --image gcr.io/my-project/my-bucket:20231005.1 --max-instances 1 --execution-environment gen2 --no-cpu-throttling --allow-unauthenticated --region us-west1 --project my-project

optionally eliminate cold starts while reducing idle cost:
add min-instance of 1 to minimize startup time and throttle the CPU when not processing requests
using --min-instances 1 and --cpu-throttling
gcloud beta run deploy my-bucket --image gcr.io/my-project/my-bucket:20231005.1  --cpu-throttling --min-instances 1 --max-instances 1 --execution-environment gen2 --no-cpu-throttling --allow-unauthenticated --region us-west1 --project my-project

run locally (terminal command):
SQLITE_PATH=./data/data.db && LSSQLITE_REPLICA_URL='gcs://bucket-name/data/data.db' && deno run -A --unstable startup.js

result:
- provided the variables/paths are correct should see it working
- when I run locally it replicates to the bucket
- every instance startup on cloud run restores from the bucket, showing the same info that collected over time

referenced:
- https://github.com/steren/litestream-cloud-run-example
- https://litestream.io/



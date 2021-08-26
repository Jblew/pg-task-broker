curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"sometask": "hi my dear"}' \
  -o - -v \
  http://localhost:3000/add?queue=dummy&timeout_ms=3600000
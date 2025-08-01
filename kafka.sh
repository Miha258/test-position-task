#!/bin/bash

TOPICS=("position-opened" "position-closed" "position-updated" "position-liquidated")

for topic in "${TOPICS[@]}"; do
  docker exec kafka \
    kafka-topics.sh \
    --create \
    --topic "$topic" \
    --bootstrap-server localhost:9092 \
    --partitions 1 \
    --replication-factor 1 \
    --if-not-exists
done

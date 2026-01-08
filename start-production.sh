#!/bin/bash

cd /home/runner/workspace/back-end && npm run start:prod &

cd /home/runner/workspace/front-end && exec npm run start

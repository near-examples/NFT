#!/bin/bash
contract=$1
web4path=$2
near call $contract upload_web_content --accountId $contract '{"filename": "'"$web4path"'", "contentbase64": "''"}'

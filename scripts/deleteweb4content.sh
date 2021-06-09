#!/bin/bash
contract=$1
web4path=$2
file=$3
near call $contract upload_web_content --accountId $contract '{"filename": "'"$web4path/$file"'", "contentbase64": "''"}'

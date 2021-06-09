#!/bin/bash
contract=$1
web4path=$2
file=$3
encoded=$(cat $file | base64)
near call $contract upload_web_content --gas=100000000000000 --accountId $contract '{"filename": "'"$web4path/$file"'", "contentbase64": "'"$encoded"'"}'

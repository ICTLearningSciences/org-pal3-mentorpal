#!/usr/bin/env bash

BIN="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

source "${BIN}/lib/getopts_long.bash"

NEWEST_CHECKPOINT=0
ARCH=lstm_v1
FROM=""
TO=""

while getopts_long "a: arch: from: newest to:" OPTKEY; do
  case ${OPTKEY} in
    'a' | 'arch' )
      ARCH="${OPTARG}"
      ;;
    'from' )
      FROM="${OPTARG}"
      ;;
    'newest' )
      NEWEST_CHECKPOINT=1
      ;;
    'to' )
      TO="${OPTARG}"
      ;;
  esac
done
shift $((OPTIND -1))

to_path="${TO}/${ARCH}"
mkdir -p "${to_path}"
from_path="${FROM}/${ARCH}"

if [[ "$NEWEST_CHECKPOINT" == "1" ]]; then
  declare -a checkpoints
  readarray -t checkpoints <<< $(ls "${from_path}" | sort -n) 
  checkpoint_newest="${checkpoints[-1]}"
  echo "INFO: copying ONLY NEWEST checkpoint from ${from_path}/${checkpoint_newest} to ${to_path}/${checkpoint_newest}"
  cp -r "${from_path}/${checkpoint_newest}" "${to_path}/${checkpoint_newest}"
else
  echo "INFO: copying ALL checkpoints from ${from_path} to ${to_path}"
  cp -r "${from_path}" "${to_path}"
fi


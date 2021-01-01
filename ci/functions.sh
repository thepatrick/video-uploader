#!/bin/bash

# errexit:  Exit immediately if a command exits with a non-zero status.
# nounset:  Treat unset variables as an error when substituting.
# pipefail: The return value of a pipeline is the status of the last command
#           to exit with a non-zero status, or zero if no command exited with
#           a non-zero status.
set -o errexit -o nounset -o pipefail

sha_files() {
  for i in "$@"; do
    pushd $i > /dev/null

    sha256sum $(git ls-files | sort)

    popd > /dev/null
  done
}

calculate_hash() {
  if [ "$#" -eq 0 ]; then
      echo "Usage: calculate-hash.sh path1 [path2] [path3] [...]"
      return 1
  fi

  sha_files "$@" | sha256sum - | cut -f 1 -d ' '
}

s3_object_exists() {
  if [ "$#" -lt 2 ]; then
    echo "Usage: s3_object_exists bucket_name object_key"
    return 1
  fi

  start_group "Checking for s3://$1/$2"
  if ( aws s3api head-object --bucket "$1" --key "$2" > /dev/null 2> /dev/null ); then
    echo "s3://$1/$2 exists."
    end_group
    return
  else
    echo "s3://$1/$2 does not exist."
    end_group
    return 1
  fi
}

start_group() {
  if [ "$#" -eq 0 ]; then
      echo "Usage: start_group message"
      return 1
  fi

  echo "::group::""$@"
}

end_group() {
  echo "::endgroup::"
}

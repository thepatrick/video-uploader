#!/bin/bash

# errexit:  Exit immediately if a command exits with a non-zero status.
# nounset:  Treat unset variables as an error when substituting.
# pipefail: The return value of a pipeline is the status of the last command
#           to exit with a non-zero status, or zero if no command exited with
#           a non-zero status.
set -o errexit -o nounset -o pipefail

sha_files() {
    for i in "$@"
    do
        pushd $i > /dev/null

        sha256sum $(git ls-files | sort)

        popd > /dev/null
    done
}

if [ "$#" -eq 0 ]; then
    echo "Usage: calculate-hash.sh path1 [path2] [path3] [...]"
    exit 1
fi

sha_files "$@" | sha256sum - | cut -f 1 -d ' '

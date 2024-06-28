git remote update
UPSTREAM=${1:-'@{u}'}
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse "$UPSTREAM")
BASE=$(git merge-base @ "$UPSTREAM")

if [ $LOCAL = $REMOTE ]; then
    echo "Up-to-date"
    elif [ $LOCAL = $BASE ]; then
    echo "Pulling from git..."
    git pull
    echo "Rebuilding..."
    /www/server/nodejs/v18.20.0/bin/yarn build
    elif [ $REMOTE = $BASE ]; then
    echo "Code on server has been edited, please check again"
else
    echo "Diverged"
fi


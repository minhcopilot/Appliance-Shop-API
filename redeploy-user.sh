cd ../Appliance-Shop-Users
git remote update
UPSTREAM=${1:-'@{u}'}
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse "$UPSTREAM")
BASE=$(git merge-base @ "$UPSTREAM")

if [ $LOCAL = $REMOTE ]; then
    echo "User: Up-to-date"
    elif [ $LOCAL = $BASE ]; then
    echo "User: Pulling from git..."
    git pull
    echo "User: Rebuilding..."
    /www/server/nodejs/v18.20.3/bin/yarn build
    echo "User: Restarting project"
    
    elif [ $REMOTE = $BASE ]; then
    echo "User: Code on server has been edited, please check again"
    exit 1
else
    echo "User: Diverged"
    exit 1
fi


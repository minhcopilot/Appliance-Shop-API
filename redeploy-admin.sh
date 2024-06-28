cd ../Appliance-Shop-Admin
git remote update
UPSTREAM=${1:-'@{u}'}
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse "$UPSTREAM")
BASE=$(git merge-base @ "$UPSTREAM")

if [ $LOCAL = $REMOTE ]; then
    echo "Admin: Up-to-date"
    elif [ $LOCAL = $BASE ]; then
    echo "Admin: Pulling from git..."
    git pull
    echo "Admin: Rebuilding..."
    /www/server/nodejs/v18.20.3/bin/yarn build
    elif [ $REMOTE = $BASE ]; then
    echo "Admin: Code on server has been edited, please check again"
else
    echo "Admin: Diverged"
fi

